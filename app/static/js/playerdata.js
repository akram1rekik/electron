'use strict'

/**
 *	playerdata.js
 *	It contains scripts for optimizer.html
 */

const Papa = require('papaparse')
const fs = require('fs')
const fileDownload = require('js-file-download')

let _uploadedData = []
let _players = []
let _rowData = []
let _playersCount = 0
let _poolTotal = 0
let _lockedTotal = 0
let _lockedSalaryTotal = 0
let _deletedTotal = 0

let requiredNameLabel;
let requiredPositionLabel;

const formatSqlString = str => str.replace(/'/g, "''")

const downloadPlayerDataTemplate = () => {
    const data = fs.readFileSync('resources/csv/playerdata-template.csv')
    const optimizer = db.prepare(`SELECT * FROM optimizers WHERE id=${_optimizerId}`).get()

    if(!optimizer) {
        return Swal.fire({
            title: 'Error!',
            text: 'Something went wrong!',
            icon: 'error',
            confirmButtonColor: '#0d7fe1'
        })
    }

    fileDownload(data, `${optimizer.name}_${optimizer.version}.csv`);

    db.exec(`UPDATE optimizers set version=${optimizer.version + 1} WHERE id=${_optimizerId}`)
}


const arrayEquals = (a, b) => {
    return Array.isArray(a) &&
        Array.isArray(b) &&
        a.length === b.length &&
        a.every((val, index) => val === b[index]);
}

const uploadCsv = (file) => {
    const csvFileSring = fs.readFileSync(file.path, { encoding: 'utf-8' })
    const { data } = Papa.parse(csvFileSring)
    const whiteAttributeList = ['Id','Name','Position','Team','Opponent','Salary','FPTS','Exposure'];

    if(!arrayEquals(whiteAttributeList, data[0])) {
        Swal.fire({
            title: 'Error!',
            text: 'Wrong csv format!',
            icon: 'error',
			confirmButtonColor: '#0d7fe1'
        })
        document.getElementById('csvUploadInput').value = ''
    }
    else {
        _uploadedData = data.slice(1)
        document.getElementById('submitCsvData').classList.remove('disabled')
    }
}

const resetUpload = () => {
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#0d7fe1',
        cancelButtonColor: '#ff0004',
        confirmButtonText: 'Yes, remove it!'
    }).then((result) => {
        if (result.isConfirmed) {
            db.exec(`DELETE FROM players WHERE optimizerId=${_optimizerId}`)
            document.getElementById('submitCsvData').classList.add('disabled')
            document.getElementById('removeCsvData').classList.add('disabled')
            document.getElementById('csvUploadInput').value = ''
            document.getElementById('nodataOverlay').classList.add('active')

            clickOnPool()
            loadCounters()

            Swal.fire({
                title: 'Deleted!',
                text: 'Your file has been deleted.',
                icon: 'success',
				confirmButtonColor: '#0d7fe1'
            })
        }
    })
}


const saveCsvData = () => {
    let skippedCsvEntries = 0
    let players = _uploadedData.map(item => {
        return {
            id: item[0] || '',
            name: item[1] || '',
            position: item[2] || '',
            team: item[3] || '',
            opponent: item[4] || '',
            salary: (item[5] && item[5] > 0) ? item[5] : 0,
            fpts: (item[6] && item[6] > 0) ? item[6] : 0,
            exposure: (item[7] && item[7] <= 100 && item[7] >= 0) ?  item[7] : 100,
            locked: 0,
            deleted: 0,
            optimizerId: _optimizerId,
        }
    })

    players = players.filter(e => {
        return e.id || e.name || e.position || e.team || e.opponent || e.salary || e.fpts || (e.exposure && e.exposure !== 100);
    });

    const select = db.prepare('SELECT * FROM players WHERE name=@name AND optimizerId=@optimizerId')
    const update = db.prepare('UPDATE players SET ' +
        'id=@id, name=@name, position=@position, team=@team, opponent=@opponent, salary=@salary, fpts=@fpts, ' +
        'exposure=@exposure, locked=@locked, deleted=@deleted WHERE _id=@_id AND optimizerId=@optimizerId')


    const insert = db.prepare('INSERT INTO players ' +
        '(id,name,position,team,opponent,salary,fpts,exposure,locked,deleted,optimizerId) VALUES ' +
        '(@id,@name,@position,@team,@opponent,@salary,@fpts,@exposure,@locked,@deleted,@optimizerId)')

    const insertMany = db.transaction((players) => {
        for(const player of players) {
            player.id = player.id.trim()
            player.name = player.name.trim()
            player.position = player.position.trim().toUpperCase()
            player.team = player.team.trim()
            player.opponent = player.opponent.trim()
            player.salary = parseInt(player.salary)
            player.fpts = parseFloat(player.fpts)
            player.exposure = parseInt(player.exposure)

            if(player.name.length === 0 || player.position.length === 0) {
                skippedCsvEntries ++;
                continue;
            }

            const existentPlayers = select.all({ name: player.name, optimizerId: player.optimizerId })
            if(existentPlayers.length) {
                const existentPlayer = existentPlayers[0]
                update.run({
                    _id: existentPlayer._id,
                    ...player
                })
            }
            else {
                insert.run(player)
            }
        }
    });

    try {
        insertMany(players)

        loadFilters(null, true)
        loadCounters()
        loadSelections()

        document.getElementById('removeCsvData').classList.remove('disabled')
        document.getElementById('submitCsvData').classList.add('disabled')
        document.getElementById('csvUploadInput').value = ''

        if(_playersCount === 0) {
            document.getElementById('nodataOverlay').classList.add('active')
        }
        else {
            document.getElementById('nodataOverlay').classList.remove('active')
        }

        if(skippedCsvEntries) {
            Swal.fire({
                title: 'Success!',
                html: `Players data is saved!<br><br><span style="color: #ff0004">skipped csv entries: ${skippedCsvEntries}</span>`,
                icon: 'success',
                confirmButtonColor: '#0d7fe1'
            }).then(() => document.location.reload())
        }
        else {
            Swal.fire({
                title: 'Success!',
                text: 'Players data is saved!',
                icon: 'success',
				confirmButtonColor: '#0d7fe1'
            }).then(() => document.location.reload())
        }
    }
    catch (err) {
        Swal.fire({
            title: 'Error!',
            text: 'Something went wrong',
            icon: 'error',
			confirmButtonColor: '#0d7fe1'
        })
    }
}


/* Players Table
 * -------------------------------------------------- */

const onNameChanged = ({ node, data: { _id, name } }) => {
    const existentPlayer = db.prepare(`SELECT * FROM players WHERE optimizerId='${_optimizerId}' AND _id='${_id}'`).get()
    const playersWithSameName = db.prepare(`SELECT * FROM players WHERE optimizerId='${_optimizerId}' AND name='${name.trim()}'`).all()
    if(name.trim().length === 0 || playersWithSameName.length > 0) {
        name = existentPlayer.name
        node.setDataValue('name', name)
    }

    db.exec(`UPDATE players SET name='${formatSqlString(name.trim())}' WHERE optimizerId='${_optimizerId}' AND _id='${_id}'`)
}

const onPositionChanged = ({ node, data: { _id, position } }) => {
    const existentPlayer = db.prepare(`SELECT * FROM players WHERE optimizerId='${_optimizerId}' AND _id='${_id}'`).get()
    if(position.trim().length === 0) {
        position = existentPlayer.position
        node.setDataValue('position', position)
    }
    db.exec(`UPDATE players SET position='${formatSqlString(position.trim().toUpperCase())}' WHERE optimizerId='${_optimizerId}' AND _id='${_id}'`)
}

const onIdChanged = ({ data: { _id, id } }) => {
    id = (id) ? id.trim() : ''
    db.exec(`UPDATE players SET id='${formatSqlString(id)}' WHERE optimizerId='${_optimizerId}' AND _id='${_id}'`)
}

const onTeamChanged = ({ data: { _id, team } }) => {
    team = (team) ? team.trim() : ''
    db.exec(`UPDATE players SET team='${formatSqlString(team)}' WHERE optimizerId='${_optimizerId}' AND _id='${_id}'`)
}

const onOpponentChanged = ({ data: { _id, opponent } }) => {
    opponent = (opponent) ? opponent.trim() : ''
    db.exec(`UPDATE players SET opponent='${formatSqlString(opponent)}' WHERE optimizerId='${_optimizerId}' AND _id='${_id}'`)
}

const onSalaryChanged = ({ node, data: { _id, salary } }) => {
    salary = parseInt(salary) || 0
    const existentPlayer = db.prepare(`SELECT * FROM players WHERE optimizerId='${_optimizerId}' AND _id='${_id}'`).get()
    if(salary < 0) {
        salary = existentPlayer.salary
    }
    node.setDataValue('salary', salary)
    db.exec(`UPDATE players SET salary=${salary} WHERE optimizerId='${_optimizerId}' AND _id='${_id}'`)
}

const onFptsChanged = ({ node, data: { _id, fpts } }) => {
    fpts = parseFloat(fpts) || 0
    const existentPlayer = db.prepare(`SELECT * FROM players WHERE optimizerId='${_optimizerId}' AND _id='${_id}'`).get()
    if(fpts < 0) {
        fpts = existentPlayer.fpts
    }
    node.setDataValue('fpts', fpts)
    db.exec(`UPDATE players SET fpts=${fpts} WHERE optimizerId='${_optimizerId}' AND _id='${_id}'`)
}

const onExposureChanged = ({ node, data: { _id, exposure } }) => {
    exposure = parseInt(exposure) || 100
    const existentPlayer = db.prepare(`SELECT * FROM players WHERE optimizerId='${_optimizerId}' AND _id='${_id}'`).get()
    if(exposure < 0 || exposure > 100) {
        exposure = existentPlayer.exposure
    }
    node.setDataValue('exposure', exposure)
    db.exec(`UPDATE players SET exposure=${exposure} WHERE optimizerId='${_optimizerId}' AND _id='${_id}'`)
}

const addRemoveClicked = ({ data: { _id, deleted } }) => {
    const newDelete = (deleted === 0) ? 1 : 0
    db.exec(`UPDATE players SET deleted=${newDelete}, locked=0 WHERE optimizerId='${_optimizerId}' AND _id='${_id}'`)

    loadFilters()
    loadCounters()
    loadSelections()
}

const lockedClicked = ({ data: { _id, locked, deleted } }) => {
    if(deleted === 1) {
        return;
    }
    const newLock = (locked === 0) ? 1 : 0
    db.exec(`UPDATE players SET locked=${newLock} WHERE optimizerId='${_optimizerId}' AND _id='${_id}'`)

    loadFilters()
    loadCounters()
    loadSelections()
}

const persistentDeleteClicked = ({ data: { _id } }) => {
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#0d7fe1',
        cancelButtonColor: '#ff0004',
        confirmButtonText: 'Yes, remove player!'
    }).then((result) => {
        if (result.isConfirmed) {
            db.exec(`DELETE FROM players WHERE optimizerId='${_optimizerId}' AND _id='${_id}'`)

            loadFilters()
            loadCounters()
            loadSelections()

            if(_playersCount === 0) {
                document.getElementById('nodataOverlay').classList.add('active')
            }

            Swal.fire({
                title: 'Deleted!',
                text: 'Player has been deleted.',
                icon: 'success',
                confirmButtonColor: '#0d7fe1'
            })
        }
    })
}

const resetLocks = () => {
    db.exec(`UPDATE players SET locked=0 WHERE optimizerId='${_optimizerId}'`)

    loadFilters()
    loadCounters()
    loadSelections()
}

const resetFpts = () => {
    db.exec(`UPDATE players SET fpts=0 WHERE optimizerId='${_optimizerId}'`)

    loadFilters()
    loadCounters()
    loadSelections()
}

const resetExposures = () => {
    db.exec(`UPDATE players SET exposure=100 WHERE optimizerId='${_optimizerId}'`)

    loadFilters()
    loadCounters()
    loadSelections()
}

const validateSetGlobalExposure = () => {
    const globalExposureInput = parseInt(document.getElementById('globalExposureInput').value)
    const setGlobalExposureBtn = document.getElementById('setGlobalExposure')

    if(isNaN(globalExposureInput) || globalExposureInput > 100 || globalExposureInput < 0) {
        setGlobalExposureBtn.classList.add('disabled')
    }
    else {
        setGlobalExposureBtn.classList.remove('disabled')
    }
}

const setGlobalExposure = () => {
    const globalExposure = parseInt(document.getElementById('globalExposureInput').value)
    db.exec(`UPDATE players SET exposure=${globalExposure} WHERE optimizerId='${_optimizerId}'`)

    loadFilters()
    loadCounters()
    loadSelections()
}

const columnDefs = [
    {
        headerName: "",
        field: "deleted",
        width: 30,
        filter: 'agNumberColumnFilter',
        suppressSizeToFit: true,
        editable: false,
        sortable: false,
        onCellClicked: addRemoveClicked,
        cellClass: 'actions pp-addremove',
        headerClass: 'actions th-addremove',
        cellRenderer: function(params) {
            if(params.value === 1) {
                return '<i class="ic-add" style="color: #05AE0E"></i>'
            }
            else {
                return '<i class="ic-subtraction" style="color: #ff0004"></i>'
            }
        }
    },
    {
        headerName: "Name",
        field: "name",
        width: 220,
        suppressSizeToFit: true,
        headerClass: 'pp-player',
        cellClass: 'pp-player',
        onCellValueChanged: onNameChanged,
        cellRenderer: function(params) { return '<i class="im im-user-male"></i>' + params.value + '' }
    },
    {
        headerName: "Pos",
        field: "position",
        minWidth: 80,
        headerClass: 'pp-position',
        cellClass: 'pp-position',
        onCellValueChanged: onPositionChanged,
    },
    {
        headerName: "Salary",
        field: "salary",
        sort: 'desc',
        minWidth: 100,
        headerClass: 'pp-salary',
        cellClass: 'pp-salary',
        onCellValueChanged: onSalaryChanged,
        cellRenderer: function(params) { return '<i class="im im-coin"></i>' + params.value + '' }
    },
    {
        headerName: "FPTS",
        field: "fpts",
        minWidth: 80,
        headerClass: 'pp-fpts',
        cellClass: 'pp-fpts',
        singleClickEdit: true,
        onCellValueChanged: onFptsChanged,
    },
    {
        headerName: "Exp.",
        field: "exposure",
        minWidth: 80,
        headerClass: 'pp-exposure',
        cellClass: 'pp-exposure',
        singleClickEdit: true,
        onCellValueChanged: onExposureChanged,
        cellRenderer: function(params) { return '' + params.value + '%' }
    },
    {
        headerName: "Team",
        field: "team",
        minWidth: 80,
        headerClass: 'pp-team',
        cellClass: 'pp-team',
        onCellValueChanged: onTeamChanged,
        cellRenderer: function(params) { return (params.value) ? params.value : 'n/a' }
    },
    {
        headerName: "Opp.",
        field: "opponent",
        minWidth: 80,
        headerClass: 'pp-opponent',
        cellClass: 'pp-opponent',
        onCellValueChanged: onOpponentChanged,
        cellRenderer: function(params) { return (params.value) ? params.value : 'n/a' }
    },
    {
        headerName: "Id",
        field: "id",
        minWidth: 50,
        headerClass: 'pp-nameid',
        cellClass: 'pp-nameid',
        onCellValueChanged: onIdChanged,
        cellRenderer: function(params) { return (params.value) ? params.value : 'n/a' }
    },
    {
        headerName: "",
        field: "locked",
        filter: 'agNumberColumnFilter',
        width: 40,
        suppressSizeToFit: true,
        suppressMenu: true,
        editable: false,
        sortable: false,
        headerClass: 'actions',
        cellClass: 'actions pp-lock',
        onCellClicked: lockedClicked,
        cellRenderer: function(params) {
            if(params.value === 1) {
                return '<i class="ic-web" style="color: #05AE0E; cursor: pointer"></i>'
            }
            else {
                return '<i class="ic-web" style="cursor: pointer"></i>'
            }
        }
    },
    {
        headerName: "",
        field: "persistentDeleted",
        width: 50,
        suppressSizeToFit: true,
        editable: false,
        sortable: false,
        headerClass: 'actions',
        cellClass: 'actions pp-delete danger',
        onCellClicked: persistentDeleteClicked,
        cellRenderer: function(params) {
            return '<i class="ic-delete-1" style="color: #ff0004"></i>'
        }
    }
];


const gridOptionsPlayerPool = {
    defaultColDef: {
        editable: true,
        sortable: true
    },
    columnDefs: columnDefs,
    headerHeight: 30,
    rowHeight: 46,
    suppressRowClickSelection: true,
    rowSelection: 'multiple',
    undoRedoCellEditing: true,
    onGridReady: function (params)
    {
        params.api.setRowData(_rowData)
        loadFilters(params)
        loadSelections(params)
    },
    onFirstDataRendered: function (params)
    {
        params.api.sizeColumnsToFit()
    },
    pagination: true,
    paginationPageSize: 50,
	stopEditingWhenGridLosesFocus: true,
    suppressHorizontalScroll: true,
    scrollbarWidth: 0,
};

const loadPlayers = () => {
    const players = db.prepare(`SELECT * FROM players WHERE optimizerId='${_optimizerId}'`).all()
    _players = players
    _playersCount = players.length

    _rowData = players.map(({ _id, id, name, position, team, opponent, salary, fpts, exposure, locked, deleted }) => {
        return {
            _id, id, name, position, team, opponent, salary, fpts, exposure, locked, deleted,
            persistentDeleted: ''
        }
    })
}

const resetSearchByName = () => {
    document.getElementById('search-players').value = ''
    const filters = gridOptionsPlayerPool.api.getFilterModel()
    loadPlayers()
    gridOptionsPlayerPool.api.forEachLeafNode(node => {
        if(node.data) {
            node.setData(_rowData.find(r => r._id === node.data._id))
        }
    })

    filters.name = null
    gridOptionsPlayerPool.api.setFilterModel(filters)

    document.getElementById('searchByNameReset').classList.add('hidden')

    checkEmptyGrid()
}

const filterByName = () => {
    const name = document.getElementById('search-players').value
    const resetBtn = document.getElementById('searchByNameReset')
    if(name.length) {
        resetBtn.classList.remove('hidden')
    }
    else {
        resetBtn.classList.add('hidden')
    }
    const filters = gridOptionsPlayerPool.api.getFilterModel()

    loadPlayers()
    gridOptionsPlayerPool.api.forEachLeafNode(node => {
        if(node.data) {
            node.setData(_rowData.find(r => r._id === node.data._id))
        }
    })

    filters.name = { filterType: 'text', type: 'contains', filter: name }
    gridOptionsPlayerPool.api.setFilterModel(filters)

    checkEmptyGrid()
}

_filterByPosition = (aElem) => {
    const positionTabs = document.getElementById('positionTabs')
    const activePos = positionTabs.querySelector('.active')
    activePos.classList.remove('active')
    aElem.classList.add('active')

    const position = aElem.text

    const filters = gridOptionsPlayerPool.api.getFilterModel()

    loadPlayers()
    gridOptionsPlayerPool.api.forEachLeafNode(node => {
        if(node.data) {
            node.setData(_rowData.find(r => r._id === node.data._id))
        }
    })

    if(position === 'ALL') {
        filters.position = null
    }
    else {
        filters.position = { filterType: 'text', type: 'equals', filter: position }
    }

    gridOptionsPlayerPool.api.setFilterModel(filters)

    checkEmptyGrid()
}

const clickOnPool = (reload=false) => {
    const filters = gridOptionsPlayerPool.api.getFilterModel()

    loadPlayers()
    if(reload === true) {
        gridOptionsPlayerPool.api.setRowData(_rowData)
    }
    else {
        gridOptionsPlayerPool.api.forEachLeafNode(node => {
            if(node.data) {
                node.setData(_rowData.find(r => r._id === node.data._id))
            }
        })
    }

    filters.deleted = { filterType: 'number', type: 'equals', filter: 0 }
    filters.locked = null
    gridOptionsPlayerPool.api.setFilterModel(filters)

    addRemoveIconToHeader(false)
    document.getElementById('poolFilter').classList.add('active')
    document.getElementById('lockedFilter').classList.remove('active')
    document.getElementById('deletedFilter').classList.remove('active')

    checkEmptyGrid()
}

const clickOnLocked = (reload=false) => {
    const filters = gridOptionsPlayerPool.api.getFilterModel()

    loadPlayers()
    if(reload === true) {
        gridOptionsPlayerPool.api.setRowData(_rowData)
    }
    else {
        gridOptionsPlayerPool.api.forEachLeafNode(node => {
            if(node.data) {
                node.setData(_rowData.find(r => r._id === node.data._id))
            }
        })
    }

    filters.deleted = null
    filters.locked = { filterType: 'number', type: 'equals', filter: 1 }
    gridOptionsPlayerPool.api.setFilterModel(filters)

    addRemoveIconToHeader()
    document.getElementById('poolFilter').classList.remove('active')
    document.getElementById('lockedFilter').classList.add('active')
    document.getElementById('deletedFilter').classList.remove('active')

    checkEmptyGrid()
}

const clickOnDeleted = (reload=false) => {
    const filters = gridOptionsPlayerPool.api.getFilterModel()

    loadPlayers()
    if(reload === true) {
        gridOptionsPlayerPool.api.setRowData(_rowData)
    }
    else {
        gridOptionsPlayerPool.api.forEachLeafNode(node => {
            if(node.data) {
                node.setData(_rowData.find(r => r._id === node.data._id))
            }
        })
    }

    filters.deleted = { filterType: 'number', type: 'equals', filter: 1 }
    filters.locked = null
    gridOptionsPlayerPool.api.setFilterModel(filters)

    addRemoveIconToHeader(true)
    document.getElementById('poolFilter').classList.remove('active')
    document.getElementById('lockedFilter').classList.remove('active')
    document.getElementById('deletedFilter').classList.add('active')

    checkEmptyGrid()
}

const loadFilters = (params=null, reload=false) => {
    const api = (params) ? params.api : gridOptionsPlayerPool.api
    const filters = api.getFilterModel()

    if(filters.deleted && filters.deleted.filter === 1) {
        return clickOnDeleted(reload)
    }

    if(filters.locked && filters.locked.filter === 1) {
        return clickOnLocked(reload)
    }

    return clickOnPool(reload)
}

const addRemoveAll = (icon) => {
    const deleted = icon.classList.contains('ic-add') ? 0 : 1
    const addRemoveIds = []

    gridOptionsPlayerPool.api.forEachNodeAfterFilter(node => {
        addRemoveIds.push(node.data._id)
    })

    const markDeleted = db.prepare(`UPDATE players SET deleted=${deleted}, locked=0 WHERE optimizerId='${_optimizerId}' AND _id=@_id`)
    const markDeletedMany = db.transaction((addRemoveIds) => {
        for(const _id of addRemoveIds) {
            markDeleted.run({ _id })
        }
    });

    markDeletedMany(addRemoveIds)

    loadFilters()
    loadCounters()
    loadSelections()
}

const addRemoveIconToHeader = (add) => {
    const addRemoveHeader = document.querySelector('.th-addremove')
    if(add === true) {
        return addRemoveHeader.innerHTML = '<i class="ic-add" onclick="addRemoveAll(this)" style="' +
            'color: #05AE0E;font-size: 18px!important; cursor: pointer;"></i>'
    }
    if(add === false) {
        return addRemoveHeader.innerHTML = '<i class="ic-subtraction" onclick="addRemoveAll(this)"' +
            ' style="color: #ff0004;font-size: 18px!important; cursor: pointer;"></i>'
    }
    addRemoveHeader.innerHTML = ''
}

const prependCalculatorBtn = () => {
    const newDiv = document.createElement('div')
    newDiv.classList.add('playerpool-calc')
    newDiv.innerHTML = `<button class="ui button primary rounded button-calculate" type="button">Calculate</button>
				<input type="number" value="1" onClick="this.select();"/>
				<label>(Max 600)</label>`

    document.querySelector('.ag-paging-panel').prepend(newDiv)

}

const prependAddPlayerBtn = () => {
    const addPlayerBtn = document.createElement('span')
    addPlayerBtn.innerHTML =`<button class="ui button primary transparent left" type="button" data-toggle="modal" data-target="#addPlayerModal">Add Player</button>`
    document.querySelector('.ag-paging-panel').prepend(addPlayerBtn)
}

const prependPaginationSelectBox = () => {
    const pageSizeOptions = ['25', '50' ,'100']

    const selectBox = document.createElement("select");
    selectBox.id = "pageSizeSelect";
    selectBox.onchange = () => {
        const selectedOption = selectBox.options[selectBox.selectedIndex].value
        gridOptionsPlayerPool.api.paginationSetPageSize(Number(selectedOption))
    };
    document.querySelector('.ag-paging-panel').prepend(selectBox)


    for (let i = 0; i < pageSizeOptions.length; i++) {
        const option = document.createElement("option");
        option.value = pageSizeOptions[i];
        option.text = pageSizeOptions[i];
        if(option.value === '50') {
            option.selected = 'selected'
        }
        selectBox.appendChild(option);
    }
}

const loadSelections = (params) => {
    const api = (params) ? params.api : gridOptionsPlayerPool.api
    const deletedPlayerIds = _players.filter(p => p.deleted).map(p => p._id)

    api.forEachLeafNode(node => {
        if(node.data) {
            if(deletedPlayerIds.includes(node.data._id)) {
                node.setSelected(true)
            }
            else {
                node.setSelected(false)
            }
        }
    })
}

const loadCounters = () => {
    _lockedSalaryTotal = 0
    _lockedTotal = 0
    _deletedTotal = 0
    _poolTotal = 0
    for(const p of _players) {
        if(p.deleted) {
            _deletedTotal++
        }
        else{
            _poolTotal++
        }

        if(p.locked) {
            _lockedTotal++
            _lockedSalaryTotal += p.salary
        }
    }

    document.getElementById('poolTotal').innerHTML = `${_poolTotal}`
    document.getElementById('lockedTotal').innerHTML = `${_lockedTotal}`
    document.getElementById('lockedSalaryTotal').innerHTML = `${_lockedSalaryTotal}`
    document.getElementById('deletedTotal').innerHTML = `${_deletedTotal}`

    if(_playersCount) {
        document.getElementById('removeCsvData').classList.remove('disabled')
    }
    else {
        document.getElementById('removeCsvData').classList.add('disabled')
    }
}

const checkEmptyGrid = () => {
    const gridBody = document.querySelector('.ag-center-cols-container')
    if(gridBody.childNodes.length === 0 && _rowData.length !== 0) {
        document.getElementById('emptyGrid').classList.remove('hidden')
    }
    else {
        document.getElementById('emptyGrid').classList.add('hidden')
    }
}


const validateAddPlayer = () => {
    const name = document.getElementById('addPlayerName').value.trim() || ''
    const position = document.getElementById('addPlayerPosition').value.trim().toUpperCase() ||''

    if(name.length === 0) {
        requiredNameLabel.classList.remove('hidden')
    }
    else {
        requiredNameLabel.classList.add('hidden')
    }

    if(position.length === 0) {
        requiredPositionLabel.classList.remove('hidden')
    }
    else {
        requiredPositionLabel.classList.add('hidden')
    }

    if(name.length && position.length) {
        document.getElementById('addPlayerBtn').classList.remove('disabled')
    }
    else {
        document.getElementById('addPlayerBtn').classList.add('disabled')
    }
}

const addPlayer = () => {
    const id = document.getElementById('addPlayerId').value.trim() || ''
    const name = document.getElementById('addPlayerName').value.trim() || ''
    const team = document.getElementById('addPlayerTeam').value.trim() || ''
    const opponent = document.getElementById('addPlayerOpponent').value.trim() || ''
    const position = document.getElementById('addPlayerPosition').value.toUpperCase().trim() || ''
    let salary = parseInt(document.getElementById('addPlayerSalary').value)
    let exposure = parseInt(document.getElementById('addPlayerExposure').value)
    let fpts = parseFloat(document.getElementById('addPlayerFpts').value)

    salary = (isNaN(salary) || salary < 0) ? 0 : salary
    fpts = (isNaN(fpts) || fpts < 0) ? 0 : fpts
    exposure = (isNaN(exposure) || exposure < 0 || exposure > 100) ? 100 : exposure

    const existentPlayers = db.prepare(`SELECT * FROM players WHERE optimizerId='${_optimizerId}' AND name='${name}'`).all()
    if(existentPlayers.length) {
        const player = existentPlayers[0]
        const update = db.prepare('UPDATE players SET ' +
            'id=@id, position=@position, team=@team, opponent=@opponent, salary=@salary, fpts=@fpts, ' +
            'exposure=@exposure, locked=@locked, deleted=@deleted WHERE _id=@_id AND optimizerId=@optimizerId')
        update.run({
            _id: player._id,
            locked: 0,
            deleted: 0,
            optimizerId: _optimizerId,
            id: id || player.id,
            team: team || player.team,
            opponent: opponent || player.opponent,
            position, salary, exposure, fpts
        })
    }
    else {
        const addPlayer = db.prepare('Insert INTO players' +
            '(id,name,position,team,opponent,salary,fpts,exposure,locked,deleted,optimizerId) VALUES ' +
            '(@id,@name,@position,@team,@opponent,@salary,@fpts,@exposure,@locked,@deleted,@optimizerId)')

        addPlayer.run({
            id, name, team, opponent, position, salary, exposure, fpts,
            locked: 0,
            deleted: 0,
            optimizerId: _optimizerId
        })
    }

    loadFilters(null, true)
    loadCounters()
    loadSelections()

    Swal.fire({
        title: 'Success!',
        text: 'Player was saved!',
        icon: 'success',
		confirmButtonColor: '#0d7fe1'
    })

    document.getElementById('addPlayerBtn').classList.add('disabled')
    document.getElementById('nodataOverlay').classList.remove('active')

    document.getElementById('addPlayerId').value = ''
    document.getElementById('addPlayerName').value = ''
    document.getElementById('addPlayerTeam').value = ''
    document.getElementById('addPlayerOpponent').value = ''
    document.getElementById('addPlayerPosition').value = ''
    document.getElementById('addPlayerSalary').value = ''
    document.getElementById('addPlayerExposure').value = ''
    document.getElementById('addPlayerFpts').value = ''

    requiredPositionLabel.classList.remove('hidden')
    requiredNameLabel.classList.remove('hidden')
}


// init
const init = () => {
    loadPlayers()
    loadCounters()

    requiredNameLabel = document.getElementById('requiredNameLabel')
    requiredPositionLabel = document.getElementById('requiredPositionLabel')
}


// wait for the document to be loaded, otherwise?/
// ag-Grid will not find the div in the document.
document.addEventListener("DOMContentLoaded", function() {
    init()
    const gridDivPlayerPool = document.querySelector('.players-table')
    if(_playersCount === 0) {
        document.getElementById('nodataOverlay').classList.add('active')
    }

    new agGrid.Grid(gridDivPlayerPool, gridOptionsPlayerPool)
    prependPaginationSelectBox()
    prependAddPlayerBtn()
    prependCalculatorBtn()
    addRemoveIconToHeader(false)
    checkEmptyGrid()
});
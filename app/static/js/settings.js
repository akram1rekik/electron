'use strict'

/**
 *	settings.js
 *	It contains scripts for optimizer.html
 */

const Swal = require('sweetalert2')

const db = require('better-sqlite3')('data/data.db', { verbose: console.log })
db.prepare('CREATE TABLE if not exists optimizers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, positions TEXT, minSalary INTEGER, maxSalary INTEGER, maxPlayers INTEGER, minTeams INTEGER, noOpponent TEXT)').run()
db.prepare('CREATE TABLE if not exists players (_id INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT, name TEXT,' +
    'position TEXT, team TEXT, opponent TEXT,  salary INTEGER, fpts REAL, exposure INTEGER,' +
    'locked INTEGER, deleted INTEGER, optimizerId INTEGER)').run()

let _filterByPosition = function () {}

const viewOptimizer = (optimizerId) => {
    const optimizer = db.prepare('SELECT * FROM optimizers WHERE id=?').get(optimizerId);

    const spanName = document.querySelector('span.optimizer-name')
    spanName.innerHTML = optimizer.name

    const inputName = document.querySelector('input.name-optimizername')
    inputName.value = optimizer.name

    const positionTable = document.getElementById('positionList')
    const positionTabs = document.getElementById('positionTabs')
    const noOpponentSel = document.querySelector('.rules-noopponent')

    positionTabs.innerHTML = '<a class="item active" onclick="_filterByPosition(this)" type="button">ALL</a>'
    positionTable.innerHTML =''
    for(let i = noOpponentSel.options.length-1; i >= 0; i--) {
        noOpponentSel.remove(i)
    }

    const option = document.createElement('option')
    option.appendChild( document.createTextNode('NONE') )
    option.value = 'NONE'
    noOpponentSel.appendChild(option)

    optimizer.positions.split('___').forEach(pos => {
        pos = pos.toUpperCase()
        positionTable.innerHTML += `<tr>
                                      <td><input type="tel" value="${pos}" placeholder="Enter position.." class="input-position" onClick="this.select();" /></td>
                                      <td class="right"><i class="ic-delete-1" aria-hidden="true" onclick="removePosition(this)"></i></td>
                                    </tr>`
        pos.split(',').forEach(posValue => {
            posValue = posValue.trim()
            if(posValue.length) {
                const positionBtn = `<a class="item" onclick="_filterByPosition(this)" type="button">${posValue}</a>`
                if(!positionTabs.innerHTML.includes(positionBtn)) {
                    positionTabs.innerHTML += positionBtn
                }

                if(!Array.from(noOpponentSel.options).map(opt => opt.text.toUpperCase()).includes(posValue)) {
                    const option = document.createElement('option')
                    option.appendChild( document.createTextNode(posValue) )
                    option.value = pos
                    noOpponentSel.appendChild(option)

                    if(posValue === optimizer.noOpponent.toUpperCase()) {
                        option.selected = true
                    }
                }
            }
        })
    });

    const minSalary = document.querySelector('.rules-minsalary')
    minSalary.value = optimizer.minSalary

    const maxSalary = document.querySelector('.rules-maxsalary')
    maxSalary.value = optimizer.maxSalary

    const maxPlayers = document.querySelector('.rules-maxplayers')
    maxPlayers.value = optimizer.maxPlayers

    const minTeams = document.querySelector('.rules-minteams')
    minTeams.value = optimizer.minTeams
}

const onChangeNoOpponentSel = () => {
    document.getElementById('saveSettingsBtn').classList.remove('disabled');
};

const updateSelectRules = (selectedValue) => {
    // clear select options
    const sel = document.querySelector('.rules-noopponent')
    const selOptionsLength = sel.options.length
    for(let i = selOptionsLength-1; i >= 0; i--) {
        sel.remove(i)
    }

    const option = document.createElement('option')
    option.appendChild( document.createTextNode('NONE') )
    option.value = 'NONE'
    sel.appendChild(option)

    const inputPositions = Array.from(document.getElementsByClassName('input-position'))
    const uniqueInputValues = [... new Set(inputPositions.map(i => i.value.toUpperCase()))]

    uniqueInputValues.forEach(inputValue => {
        inputValue.split(',').forEach(value => {
            value = value.trim()
            if(value.length) {
                //console.log(sel.options.map(opt => opt.text.toUpperCase()))
                if(!Array.from(sel.options).map(opt => opt.text.toUpperCase()).includes(value.toUpperCase())) {
                    const option = document.createElement('option')
                    option.appendChild( document.createTextNode(value) )
                    option.value = value
                    sel.appendChild(option)
                    if(option.value === selectedValue) {
                        option.selected = true
                    }
                }
            }
        })
    })
}

const validateSettings = () => {
    let validation = true

    // validate name
    const name = document.querySelector('input.name-optimizername').value || ''
    if(!name) {
        document.getElementById('nameValidation').classList.remove('hidden')
        validation = false
    }
    else {
        document.getElementById('nameValidation').classList.add('hidden')
    }

    // validate positions and noOpponent select
    const htmlPositions = document.getElementsByClassName('input-position')
    let positions = ''
    if(htmlPositions && htmlPositions.length) {
        positions =  Array.from(htmlPositions).map(i => i.value).filter(i => i.trim().length).join('___')
    }

    if(!positions) {
        document.getElementById('positionsValidation').classList.remove('hidden')
        validation = false
    }
    else {
        document.getElementById('positionsValidation').classList.add('hidden')
    }

    // validate maxSalary
    const maxSalary = parseInt(document.querySelector('.rules-maxsalary').value) || 0
    if(maxSalary <= 0) {
        document.getElementById('maxSalaryValidation').classList.remove('hidden')
        validation = false
    }
    else {
        document.getElementById('maxSalaryValidation').classList.add('hidden')
    }

    if(validation === true) {
        document.getElementById('saveSettingsBtn').classList.remove('disabled')
    }
    else {
        document.getElementById('saveSettingsBtn').classList.add('disabled')
    }
}

const removePosition = (elem) => {
    elem.parentElement.parentElement.remove()
    updateSelectRules()
    validateSettings()
}

const addPosition = () => {
    const positionsBody = document.getElementById('positionList')
    console.log()
    const tr = document.createElement('tr')
    const td1 = document.createElement('td')
    const td2 = document.createElement('td')
    td2.className = 'right'
    const input = document.createElement('input')
    input.type = 'tel'
    input.placeholder = 'Enter Position..'
    input.className = 'input-position'
    input.addEventListener("input", function () {
        updateSelectRules()
        validateSettings()
    })
    const icon = document.createElement('i')
    icon.className = 'ic-delete-1'
    icon.onclick = function () { return removePosition(icon) }

    positionsBody.appendChild(tr)
    tr.appendChild(td1)
    tr.appendChild(td2)
    td1.appendChild(input)
    td2.appendChild(icon)
}


const getQueryStringValue = (key) => {
    return decodeURIComponent(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
}


const editOptimizer = () => {
    const name = document.querySelector('input.name-optimizername').value.replace(/'/g, "''") || ''
    const positions = Array.from(document.getElementsByClassName('input-position')).map(i => i.value).filter(i => i.trim().length).join('___') || ''
    const minSalary = parseInt(document.querySelector('.rules-minsalary').value) || 0
    const maxSalary = parseInt(document.querySelector('.rules-maxsalary').value) || 0
    const maxPlayers = parseInt(document.querySelector('.rules-maxplayers').value) || 0
    const minTeams = parseInt(document.querySelector('.rules-minteams').value) || 0
    const noOpponentSelect = document.querySelector('.rules-noopponent')
    const noOpponent = noOpponentSelect.options[noOpponentSelect.selectedIndex].value.replace(/'/g, "''") || '';

    db.exec(`UPDATE optimizers SET name='${name}', positions='${positions}', minSalary=${minSalary}, maxSalary=${maxSalary}, maxPlayers=${maxPlayers}, minTeams=${minTeams}, noOpponent='${noOpponent}' WHERE id=${_optimizerId}`)
    Swal.fire({
        title: 'Success!',
        text: 'Optimizer is updated!',
        icon: 'success',
		confirmButtonColor: '#0d7fe1'
    })
    viewOptimizer(_optimizerId)

    document.getElementById('saveSettingsBtn').classList.add('disabled')
}

// init script
const _optimizerId = getQueryStringValue("id")
viewOptimizer(_optimizerId)
validateSettings()
document.getElementById('saveSettingsBtn').classList.add('disabled')
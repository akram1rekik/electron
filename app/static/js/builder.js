'use strict'

/**
 *	builder.js
 *	It contains scripts for dashboard.html
 */

const Swal = require('sweetalert2')

const db = require('better-sqlite3')('data/data.db', { verbose: console.log })
db.prepare('CREATE TABLE if not exists optimizers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, positions TEXT, minSalary INTEGER, maxSalary INTEGER, maxPlayers INTEGER, minTeams INTEGER, noOpponent TEXT, version INTEGER DEFAULT 0)').run()
db.prepare('CREATE TABLE if not exists players (_id INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT, name TEXT,' +
    'position TEXT, team TEXT, opponent TEXT,  salary INTEGER, fpts REAL, exposure INTEGER,' +
    'locked INTEGER, deleted INTEGER, optimizerId INTEGER)').run()

const listOptimizers = () => {
    const dbOptimizers = db.prepare('SELECT * FROM optimizers WHERE id IS NOT NULL').all()
    const optimizerList = document.getElementById('optimizerList')
    optimizerList.innerHTML = ''

    for(const optimizer of dbOptimizers) {
        optimizerList.innerHTML += `<tr class="list-container">  
				 <td class="optimizerlist-favorite"><a class="ui button transparent no-padding" type="button"><i class="im im-star" aria-hidden="true"></i></a></td>
                 <td class="optimizerlist-open"><a href="Optimizer.html?id=${optimizer.id}" class="ui button primary transparent no-padding"><i class="im im-folder-open" aria-hidden="true"></i> Open</a></td>
				 <td class="optimizerlist-name"><i class="im im-file-o" aria-hidden="true"></i> ${optimizer.name}</td>
                 <td class="optimizerlist-delete"><a class="ui button danger transparent no-padding" type="button" onclick="deleteOptimizer(${optimizer.id})"><i class="ic-delete-1" aria-hidden="true"></i></a></td>
             </tr>`
    }
}

const activeBuilder = () => {
    if(document.getElementsByClassName('list-container').length) {
        document.getElementById('nodataOverlay').classList.remove('active')
    }
    else {
        document.getElementById('nodataOverlay').classList.add('active')
    }
}

const step1Click = () => {
    document.getElementById('previousBtn').classList.add('hidden')
    document.getElementById('nextBtn').classList.remove('hidden')
    document.getElementById('buildSubmit').classList.add('hidden')

    document.getElementById('tabStep1').classList.add('primary')
    document.getElementById('tabStep2').classList.remove('primary')
    document.getElementById('tabStep3').classList.remove('primary')
    validateStep1()
    validateStep2()
    validateStep3()
}

const step2Click = () => {
    document.getElementById('previousBtn').classList.remove('hidden')
    document.getElementById('nextBtn').classList.remove('hidden')
    document.getElementById('buildSubmit').classList.add('hidden')

    document.getElementById('tabStep1').classList.remove('primary')
    document.getElementById('tabStep2').classList.add('primary')
    document.getElementById('tabStep3').classList.remove('primary')
    validateStep1()
    validateStep2()
    validateStep3()
}

const step3Click = () => {
    document.getElementById('previousBtn').classList.remove('hidden')
    document.getElementById('nextBtn').classList.add('hidden')
    document.getElementById('buildSubmit').classList.remove('hidden')

    document.getElementById('tabStep1').classList.remove('primary')
    document.getElementById('tabStep2').classList.remove('primary')
    document.getElementById('tabStep3').classList.add('primary')
    validateStep1()
    validateStep2()
    validateStep3()
}


const nextStep = () => {
    const activeStep = document.querySelector('div.builder-tabs > button.primary').dataset.target
    if(activeStep === '#step1') {
        document.getElementById('tabStep2').click()

        step2Click()
        validateStep2()
    }

    if(activeStep === '#step2') {
        document.getElementById('tabStep3').click()

        step3Click()
        validateStep3()
    }
}


const previousStep = () => {
    const activeStep = document.querySelector('div.builder-tabs > button.primary').dataset.target
    if(activeStep === '#step3') {
        document.getElementById('tabStep2').click()

        step2Click()
        validateStep2()
    }

    if(activeStep === '#step2') {
        document.getElementById('tabStep1').click()

        step1Click()
        validateStep1()
    }
}

const removePosition = (elem) => {
    elem.parentElement.parentElement.remove()
    updateSelectRules()
    validateStep2()
}

const addPosition = () => {
    const positionsBody = document.getElementById('positionList')
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
        validateStep1()
        validateStep2()
        validateStep3()
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

const updateSelectRules = () => {
    // clear select options
    const sel = document.getElementById('noOpponent')
    const selOptionsLength = sel.options.length
    for(let i = selOptionsLength-1; i >= 0; i--) {
        sel.remove(i)
    }

    const option = document.createElement('option')
    option.appendChild( document.createTextNode('NONE') )
    option.value = 'NONE'
    sel.appendChild(option)

    const inputPositions = Array.from(document.getElementsByClassName('input-position'))
    const uniqueInputValues = [... new Set(inputPositions.map(i => i.value))]

    uniqueInputValues.forEach(inputValue => {
        inputValue.split(',').forEach(value => {
            value = value.trim()
            if(value.length) {
                if(!Array.from(sel.options).map(opt => opt.text.toUpperCase()).includes(value.toUpperCase())) {
                    const option = document.createElement('option')
                    option.appendChild( document.createTextNode(value) )
                    option.value = value
                    sel.appendChild(option)
                }
            }
        })
    })
}

const getName = () => {
    const name = document.getElementById('optimizerName').value || ''
    return name;
}

const validateStep1 = () => {
    let validation = true
    const name = getName();

    if(!name) {
        document.getElementById('nameValidation').classList.remove('hidden')
        validation = false
    }
    else {
        document.getElementById('nameValidation').classList.add('hidden')
    }

    if(validation === true) {
        document.getElementById('nextBtn').disabled = false
        document.getElementById('tabStep2').disabled = false
        document.getElementById('tabStep3').disabled = false
    }
    else {
        document.getElementById('nextBtn').disabled = true
        document.getElementById('tabStep2').disabled = true
        document.getElementById('tabStep3').disabled = true
    }
}

const getPositions = () => {
    const htmlPositions = document.getElementsByClassName('input-position')
    let positions = ''
    if(htmlPositions && htmlPositions.length) {
        positions =  Array.from(htmlPositions).map(i => i.value).filter(i => i.trim().length).join('___')
    }

    return positions
}


const validateStep2 = () => {
    let validation = true
    const positions = getPositions()

    if(!positions) {
        document.getElementById('positionsValidation').classList.remove('hidden')
        validation = false
    }
    else {
        document.getElementById('positionsValidation').classList.add('hidden')
    }

    if(validation === true) {
        document.getElementById('nextBtn').disabled = false
        document.getElementById('tabStep3').disabled = false
    }
    else {
        document.getElementById('nextBtn').disabled = true
        document.getElementById('tabStep3').disabled = true
    }
    document.getElementById('tabStep1').disabled = false
}

const getMaxSalary = () => {
    const maxSalary = parseInt(document.getElementById('maxSalary').value) || 0
    return maxSalary
}

const validateStep3 = () => {
    let validation = true
    const maxSalary = getMaxSalary();

    if(maxSalary <= 0) {
        document.getElementById('maxSalaryValidation').classList.remove('hidden')
        validation = false
    }
    else {
        document.getElementById('maxSalaryValidation').classList.add('hidden')
    }

    if(validation === true && getPositions() && getName()) {
        document.getElementById('buildSubmit').disabled = false
    }
    else {
        document.getElementById('buildSubmit').disabled = true
    }
    document.getElementById('tabStep1').disabled = false
    document.getElementById('tabStep2').disabled = false
}


const buildOptimizer = () => {
    const name = getName().replace(/'/g, "''")
    const positions = getPositions().replace(/'/g, "''")
    const minSalary = parseInt(document.getElementById('minSalary').value) || 0
    const maxSalary = getMaxSalary()
    const maxPlayers = parseInt(document.getElementById('maxPlayers').value) || 0
    const minTeams = parseInt(document.getElementById('minTeams').value) || 0
    const noOpponentSelect = document.getElementById("noOpponent");
    let noOpponent = ''
    if(noOpponentSelect.options.length > 0) {
        noOpponent = noOpponentSelect.options[noOpponentSelect.selectedIndex].value
        noOpponent = noOpponent.replace(/'/g, "''")
    }

    db.exec(`INSERT INTO optimizers (name, positions, minSalary, maxSalary, maxPlayers, minTeams, noOpponent) VALUES ('${name}', '${positions}', ${minSalary}, ${maxSalary}, ${maxPlayers}, ${minTeams}, '${noOpponent}')`)
    listOptimizers()
    activeBuilder()

}

const deleteOptimizer = (optimizerId) => {
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
            db.exec(`DELETE FROM optimizers WHERE id=${optimizerId}`)
            db.exec(`DELETE FROM players WHERE optimizerId=${optimizerId}`)
            listOptimizers()
            activeBuilder()

            Swal.fire({
                title: 'Deleted!',
                text: 'Your file has been deleted.',
                icon: 'success',
                confirmButtonColor: '#0d7fe1'
            })
        }
    })
}


const deleteAll = () => {
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
            db.exec(`DELETE FROM optimizers`)
            db.exec(`DELETE FROM players`)
            listOptimizers()
            activeBuilder()
            Swal.fire(
                'Deleted!',
                'Your file has been deleted.',
                'success'
            )
        }
    })
}


// init script
listOptimizers()
activeBuilder()
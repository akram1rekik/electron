'use strict';

/**
 *	matchdata.js
 *	It contains scripts for optimizer.html
 */

let _projectionData;
let _isEmptyProjectionGrid;

/* Match Data Table Handsontable
 * -------------------------------------------------- */
// Handsontable Setup For Upload & Match Data
let hot = new Handsontable(document.getElementById('uploadprojections'), {
    startCols: 3,
    startRows: 10,
    stretchH: 'all',
    height: 314,
    observeChanges: true,
    colWidths: [150, 100, 100],
    rowHeaders: true,
    renderAllRows: true,
    colHeaders: [
        'Name',
        'FPTS',
        'Exposure'
    ]
});


const loadProjectionData = () => {
    _projectionData = Papa.parse(hot.getData().toString())
    _isEmptyProjectionGrid = (_projectionData.data[0]) ? ! _projectionData.data[0].filter(e => e !== '').length : false;

    if(_isEmptyProjectionGrid) {
        document.getElementById('validateProjectionsBtn').classList.add('disabled');
        document.getElementById('clearProjectionsBtn').classList.add('disabled');
    }
    else {
        document.getElementById('validateProjectionsBtn').classList.remove('disabled');
        document.getElementById('clearProjectionsBtn').classList.remove('disabled');
    }
}

Handsontable.hooks.add('afterChange', loadProjectionData);
Handsontable.hooks.add('afterPaste', loadProjectionData);

document.getElementById('modalMatchData').addEventListener('shown.bs.modal', function (e) {
    setTimeout(() => {
        hot.render();
        loadProjectionData()
    }, 10);
});

const validateProjections = () => {
    loadProjectionData()

    let skippedProjectionsCount = 0
    let skippedRows = []
    const data = _projectionData.data[0]
    const rows = [];
    for(let i = 0; i < data.length; i = i + 3) {
        rows.push([data[i], data[i+1], data[i+2]])
    }

    for(const row of rows) {
        const name = row[0];
        const fpts = (row[1] && parseFloat(row[1]) > 0) ? parseFloat(row[1]) : 0;
        let exposure = (row[2] && parseInt(row[2]) > 0 && parseInt(row[2]) < 100) ? row[2] : 100;
        if(row[2] === 0) {
            exposure = 0
        }

        if(!name && !row[1] && !row[2]) {
            continue;
        }

        if(!name) {
            skippedProjectionsCount++ ;
            skippedRows.push(row);
            continue;
        }

        const player = db.prepare('SELECT * FROM players WHERE name=@name AND optimizerId=@optimizerId')
            .get({ name, optimizerId: _optimizerId });

        if(!player) {
            skippedProjectionsCount++ ;
            skippedRows.push(row);
            continue;
        }

        db.exec(`UPDATE players SET fpts=${fpts}, exposure=${exposure} WHERE optimizerId='${_optimizerId}' AND _id='${player._id}'`)
    }

    if(skippedRows.length < 10) {
        for (let i=skippedRows.length; i < 10 ; i++) {
            skippedRows.push(['','','']);
        }
    }

    hot = new Handsontable(document.getElementById('uploadprojections'), {
        data: skippedRows,
        startCols: 3,
        startRows: 10,
        stretchH: 'all',
        height: 314,
        colWidths: [150, 100, 100],
        rowHeaders: true,
        renderAllRows: true,
        colHeaders: [
            'Name',
            'FPTS',
            'Exposure'
        ]
    });

    loadProjectionData()
    loadFilters()
    loadCounters()
    loadSelections()

    if(skippedProjectionsCount === 0) {
        Swal.fire({
            title: 'Success!',
            text: 'Projections were applied',
            icon: 'success',
			confirmButtonColor: '#0d7fe1'
        })
    }
    else {
        Swal.fire({
            title: 'Oops!',
            html: `Not all projections were applied<br><br><span style="color: #ff0004">skippedProjections: ${skippedProjectionsCount}</span>`,
            icon: 'error',
			confirmButtonColor: '#0d7fe1'
        })
    }
};

const clearProjections = () => {
    hot = new Handsontable(document.getElementById('uploadprojections'), {
        startCols: 3,
        startRows: 10,
        stretchH: 'all',
        height: 314,
        colWidths: [150, 100, 100],
        rowHeaders: true,
        renderAllRows: true,
        colHeaders: [
            'Name',
            'FPTS',
            'Exposure'
        ]
    });

    loadProjectionData()
};
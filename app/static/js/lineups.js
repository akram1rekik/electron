'use strict';

/**
*	lineups.js
*	It contains scripts for optimizer.html
*/

const clickOnPlayerStabMenu = () => {
    document.querySelector('a.item.playerstab').classList.add('active')
    document.querySelector('a.item.lineupstab').classList.remove('active')

    document.getElementById('playerStabMenu').classList.remove('hidden')
    document.getElementById('playerStabMenu').classList.add('active')

    document.getElementById('lineupStabMenu').classList.add('hidden')
    document.getElementById('lineupStabMenu').classList.remove('active')
}


const clickOnLineupStabMenu = () => {
    document.querySelector('a.item.playerstab').classList.remove('active')
    document.querySelector('a.item.lineupstab').classList.add('active')

    document.getElementById('playerStabMenu').classList.add('hidden')
    document.getElementById('playerStabMenu').classList.remove('active')

    document.getElementById('lineupStabMenu').classList.remove('hidden')
    document.getElementById('lineupStabMenu').classList.add('active')
}
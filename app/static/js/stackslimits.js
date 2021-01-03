'use strict'

/**
 *	stackslimits.js
 *	It contains scripts for optimizer.html, extends settings
 */

var select=new MSFmultiSelect(
  document.querySelector('#selectPositionsStack'),
  {
    onChange:function(checked,value,instance){
      console.log(checked,value,instance);
    },
    appendTo:'#positionsStack'
  }
);

var select=new MSFmultiSelect(
  document.querySelector('#selectPositionsLimit'),
  {
    onChange:function(checked,value,instance){
      console.log(checked,value,instance);
    },
    appendTo:'#positionsLimit'
  }
);
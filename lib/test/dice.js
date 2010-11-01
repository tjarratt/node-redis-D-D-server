function rollDice() {  
  var d2Roll = Math.floor(Math.random() * 2) + 1;
  var $d2ele = $("span#d2-" + d2Roll.toString());
  var oldRollCount = $d2ele.html();
  var updatedRollCount = (oldRollCount - 0) + 1;
  $d2ele.html(updatedRollCount);
  
  var d8Roll = Math.floor(Math.random() * 8) + 1;
  var $d8ele = $("span#d8-" + d8Roll.toString());
  var old8Count = $d8ele.html();
  var updated8Count = (old8Count - 0) + 1;
  $d8ele.html(updated8Count);
  
  var d20Roll = Math.floor(Math.random() * 20) + 1;
  var $d20Ele = $("span#d20-" + d20Roll.toString());
  var old20Count = $d20Ele.html();
  var updated20count = (old20Count - 0) + 1;
  $d20Ele.html(updated20count);
  
  //update iterations
  var iterEle = $("span#iterations");
  var iterationsThusFar = (iterEle.html() - 0);
  iterEle.html(iterationsThusFar + 1);
  
  window.setTimeout(rollDice, 1);
}
function initDice() {
  window.setTimeout(rollDice, 1);
}
function rollAndUpdateDie(die) {
  //TODO: implement this, refactor above
  /*if !(die in [2, 8, 20]) {
    alert("blah");
  }*/
}

$(document).ready(initDice);
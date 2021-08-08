//=================
//sal_roueMovement.js
//=================
/*:
 * @plugindesc (v.1.1) An experimental plugin to move event along region ID
 * Version 1.0 - release
 * Version 1.1 - fixed issue where event returns back to starting coordinates when event blocks its path. Now, it just waits for its turn.
 *
 * @author autodidact (Samuel Carrillo)
 *
 * @help
 * Script Command:
 * _sal.routeMovement.moveAlongRegion(this, [self-switch])
 * Place the script command into a Set Movement Route 
 * command and change the target to this event.
 *
 * Moving events to a certain x,y destination can be difficult.
 * But using region Ids to define a route may make it a little easier.
 * 
 * This script is very simple with only one script command.
 * First, define your region id path for an event to walk along.
 * Second, put your event directly on the starting region tile that
 * starts the path.
 * Third, put 
 * _sal.routeMovement.moveAlongRegion(this, [self-switch])
 * into a set movement route. The self switch and blocking self-switch are optional.
 * 
 * Using no self-switch on a movement route with an event trigger of 
 * "Action Button" will allow the event to follow the route back to
 * its original starting pointing.
 * 
 * Add the self switch to the script call to remove further movement
 * by region. You will have to create an event page with the self switch
 * check.
 * 
 *
 * TERMS OF USE
 * This plugin is currently free for all use.
 * 
 * COMPATIBILITY
 * No known issues.
 */

var _sal = _sal || {};
_sal.routeMovement = {};


(function($){

var lastTileOnPath = {};
//No parameters
//var parameters = PluginManager.parameters("sal_routeMovement");


//Run a loop on if statement using compass to determine the next direction
const compass = [2,4,6,8]; //relabel this as behind
const com = [8,6,4,2]; //relabel this as compass (the way to go based off regionID and the "behind" array)
function ifRegionExistsAhead(currentevent, thisX, thisY, thisR) {
  var regionExistsInDirection = [];
  var xvariance;
  var yvariance;

  for (i = 0; i < compass.length; i++) {

    xvariance = 0;
    yvariance = 0;
    if (compass[i] == 2) {yvariance = -1;} //down
    if (compass[i] == 4) {xvariance = 1;} //left
    if (compass[i] == 6) {xvariance = -1;} //right
    if (compass[i] == 8) {yvariance = 1;} //up

    console.log(compass[i] + "variance: "+ xvariance);
    if (thisR == $gameMap.regionId(thisX+xvariance, thisY+yvariance) && currentevent._direction != compass[i]) { 
      //if the region exists in this direction.
      regionExistsInDirection.push(com[i]);
    }
    else { 
      //if the region does not exist in this direction.
      regionExistsInDirection.push(null);
    }
  }
  return regionExistsInDirection;
}




_sal.routeMovement.moveAlongRegion = function(currentevent, selfswitch, blockedSelfSwitch) {
  currentevent._sal_routemovement = currentevent._sal_routemovement || {};
  //console.log(currentevent._sal_routemovement.pathIsClear);
  currentevent._sal_routemovement.pathIsClear = currentevent._sal_routemovement.pathIsClear ?? true; //used || but with a booleean check it always gave the wrong result. ?? is good for a boolean check since it only looks for null or undefined.

  let thisX = currentevent.x; //console.log(thisX);
  let thisY = currentevent.y; //console.log(thisY);
  let thisR = $gameMap.regionId(thisX, thisY); //console.log(thisR);

  //console.log(currentevent._sal_routemovement.pathIsClear);
  if (currentevent._sal_routemovement.pathIsClear) {
  var movementPaths = ifRegionExistsAhead(currentevent, thisX, thisY, thisR); //this sets all all directional paths as available or unavailable.

  //if you have reached end of route, all movement directions have a value of null, then activate switch (if user provided a switch), and end this funtion.
  if (movementPaths.every(arrayIndex => arrayIndex == null)) {
    if (selfswitch) {
      selfswitch = selfswitch.toUpperCase();

      if (selfswitch == 'A' || selfswitch == 'B' || selfswitch == 'C' || selfswitch == 'D') {
        var key = [$gameMap._mapId, currentevent._eventId, selfswitch];
        $gameSelfSwitches.setValue(key, true);
      }
    }
    return;
  }

  console.log("x: " + thisX + " Y: " + thisY);
  //console.log(movementPaths);
  var availablePaths = movementPaths.filter(pathExists => pathExists != null); //this filters movementPaths for only the options that are valid (not null) paths.
  //we are going to prefer the first available path.
  var pathAvailableInDirection = availablePaths[0]; //This should never return an empty undefined var since we do the check above. 
  //if there are multiple paths, then we should get the length of array and if there are more than 1 path, pass to a decision making function based off user supplied parameters.
  currentevent.setDirection(pathAvailableInDirection); //turn toward first availablePath[0]. //We need this to do the currentevent.canPass check. //Or we could just pass in pathAvailableInDirection
  }

  //do a check o see if the move is available (free of events or character)
  var movementAllowed = currentevent.canPass(thisX, thisY, currentevent.direction());

  if (movementAllowed) {
    currentevent._sal_routemovement.pathIsClear = true;
    currentevent.moveStraight(currentevent.direction()); //event should move direction that it is facing.
  }
  else { //the movement is blocked by an event.
    //if blocked, stoppinig checking for new paths and wait for the path to clear.
    currentevent._sal_routemovement.pathIsClear = false;
    //console.log(currentevent._sal_routemovement.pathIsClear);
    if (blockedSelfSwitch) {
            blockedSelfSwitch = blockedSelfSwitch.toUpperCase();
      
            if (blockedSelfSwitch == 'A' || blockedSelfSwitch == 'B' || blockedSelfSwitch == 'C' || blockedSelfSwitch == 'D') {
              var key = [$gameMap._mapId, currentevent._eventId, blockedSelfSwitch];
              $gameSelfSwitches.setValue(key, true);
            }
          }
  } //end else

} //end moveAlongRegion function


//this function is for easier script call from eventing page.
_sal.checkRegion = _sal.routeMovement.moveAlongRegion;

}(_sal));

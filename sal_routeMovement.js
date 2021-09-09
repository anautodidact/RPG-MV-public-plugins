//=================
//sal_core.js
//=================
/*:
 * @plugindesc (v.2.0) An experimental plugin to move event along region ID
 *
 * @author autodidact (Samuel Carrillo)
 *
 * @help
 * Script Command:
 * _sal.routeMovement.moveAlongRegion(this, [self-switch], [block self-switch], arrayOfDirections)
 * Place the script command into a Set Movement Route 
 * command and change the target to this event.
 *
 * Moving events to a certain x,y destination can be difficult.
 * But using region Ids to define a route may make it a little easier.
 * 
 * First, define your region id path for an event to walk along.
 * Second, put your event directly on the starting region tile that
 * starts the path.
 * Third, put _sal.routeMovement.moveAlongRegion(this);
 * into a set movement route. The other parameters are optional.
 * 
 * Using no self-switch on a movement route with an event trigger of 
 * "Action Button" will allow the event to follow the route back to
 * its original starting pointing.
 * 
 * Add the self switch to the script call to do event commands after
 * route has completed. You will have to create the event page with 
 * the self switch check to run the commands.
 * 
 * You can add a second self-switch to run code when the event is blocked.
 * (This is a work in progress, and has bare functionality)
 * 
 * You may create paths for the event to follow. The logic for the path check must 
 * be done in the event. Then in the script call, you can add an array to tell the
 * event which path to take when reaching an intersection.
 * 
 * Example:
 * _sal.routeMovement.moveAlongRegion(this, "A", "B", [2,4,6,8]);
 * 
 * This event will turn self-switch A on after route is complete,
 * this event will turn self-switch B on if route is blocked,
 * this event has an array of [2,4,6,8] which tells the event, 
 * at intersection 1 turn down (2), 
 * at intersection 2 turn left (4),
 * at intersection 3 turn right(6),
 * at intersection 4 turn up (8)
 * Note, look at your keypad if you need help remembering the directions.
 * 
 * 
 *
 * TERMS OF USE
 * This plugin is currently free for all use.
 * 
 * COMPATIBILITY
 * No known issues.
 * 
 */

var _sal = _sal || {};
_sal.routeMovement = {};
_sal.Alias = _sal.Alias || {};
var _salCE = console.error;

//take three
//Stick with self-switches. If necessary, game dev can try hime more self-switches or a switch in-combo.
//To manage if blocked, try having an isBlocked boolean var. We will also store the xY of blocked tile. 
//When the boolean var is set, the plugin can activate flee code.
//The flee code will run in a parallel event(?). Which also holds a route movement command, which holds a repeatable movement(?) to check if the xY of blocked tile is no longer blocked.
//If it is no longer plugged, use a route finder location to get back to the blocked square and then resume original route processing. If still blocked, then continue to repeat the check movement command.

//8-12-21
//most of this is working (had to rely more on eventing than I would have liked), but I still have the problem of branching paths.
//This is theoretically easy, but I would like to accomodate user input and/or switches to determine branch path.

(function($){

var lastTileOnPath = {};
//No parameters
//var parameters = PluginManager.parameters("sal_routeMovement");


_sal.Alias.gameEvent_initialize = Game_Event.prototype.initialize;
Game_Event.prototype.initialize = function(mapId, eventId) {
  _sal.Alias.gameEvent_initialize.call(this, mapId, eventId);
  
  //initialize routeMovement variables.
  this._sal_routemovement = {};
  this._sal_blockedX = null;
  this._sal_blockedY = null;
  this._sal_routemovement.blockedAlert = false;
  this._sal_routemovement.pathIsClear = true;
};

//additions to the Game_Event for all events so that we can manage code to run when event is blocked.
Game_Event.prototype._salRM_isBlocked = function () {
  return this._sal_routemovement.blockedAlert; //== false
};
Game_Event.prototype._salRM_toggleBlocked = function () {
  if (this._sal_routemovement.blockedAlert) {this._sal_routemovement.blockedAlert = false;}
  else {this._sal_routemovement.blockedAlert = true;}
};

Game_Event.prototype.stillBlocked = function (currentevent) {
  let thisX = currentevent.x; //console.log(thisX);
  let thisY = currentevent.y; //console.log(thisY);

  let istileBlocked = $gameMap.eventsXy(this._sal_routemovement.blockedX,this._sal_routemovement.blockedY);
  let movementAllowed = currentevent.canPass(thisX, thisY, currentevent.direction());

  _salCE(istileBlocked);
  _salCE(movementAllowed);

  if (istileBlocked.length === 0 && movementAllowed) {
    this._sal_routemovement.pathIsClear = true;
    return false; //stillBlocked = false;
  }
  else {return true;} //stillblocke = true;
  //if (!movementAllowed) {this._sal_routemovement.retreat();}
}

Game_Event.prototype._SalRM_intersectionCounter = 0;
///////////////////////////////////////////////////////////////////if blocked code is above.


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


//This code is a copy of above, except it is used for finding the path behind
//Run a loop on if statement using compass to determine the next direction
function ifRegionExistsBehind(currentevent, thisX, thisY, thisR) {
  var regionExistsInDirection = [];
  let xvariance;
  let yvariance;

  for (i = 0; i < bcompass.length; i++) {

    xvariance = 0;
    yvariance = 0;
    if (bcompass[i] == 2) {yvariance = -1;} //down
    if (bcompass[i] == 4) {xvariance = 1;} //left
    if (bcompass[i] == 6) {xvariance = -1;} //right
    if (bcompass[i] == 8) {yvariance = 1;} //up

    console.log(bcompass[i] + "variance: "+ xvariance);
    if (thisR == $gameMap.regionId(thisX+xvariance, thisY+yvariance) && currentevent._direction != bcompass[i]) { 
      //if the region exists in this direction.
      regionExistsInDirection.push(bcom[i]);
    }
    else { 
      //if the region does not exist in this direction.
      regionExistsInDirection.push(null);
    }
  }
  return regionExistsInDirection;
}


_sal.routeMovement.moveAlongRegion = function(currentevent, selfswitch, blockedSelfSwitch, actionOnIntersection) {
  let thisX = currentevent.x; //console.log(thisX);
  let thisY = currentevent.y; //console.log(thisY);
  let thisR = $gameMap.regionId(thisX, thisY); //console.log(thisR);

  // if (regionIntersection()) {
  //   //run decision making code.
  //   //this.moveRight() //as a parameter that should work if we pass it to eval();
  //   eval(actionOnIntersection);
  // }

  if (currentevent._sal_routemovement.pathIsClear) {
  var movementPaths = ifRegionExistsAhead(currentevent, thisX, thisY, thisR); //this sets all all directional paths as available or unavailable.

  //if you have reached end of route, all movement directions have a value of null, then activate switch (if user provided a switch), and end this funtion.
  if (movementPaths.every(arrayIndex => arrayIndex == null)) {
    //if there is a selfswitch parameter
    if (selfswitch) {
      selfswitch = selfswitch.toUpperCase();

      //selfswitch = selfswitch.charAt(0);
      if (selfswitch == 'A' || selfswitch == 'B' || selfswitch == 'C' || selfswitch == 'D') {
        var key = [$gameMap._mapId, currentevent._eventId, selfswitch];
        $gameSelfSwitches.setValue(key, true);
        // var cev = new sal_Game_Event($gameMap._mapId, $dataMap.events.length);
        // cev.setLocation(5,5);
      }
    }
    return;
  } //if there are no paths to follow then exit this function.

  var availablePaths = movementPaths.filter(pathExists => pathExists != null); //this filters movementPaths for only the options that are valid (not null) paths.
  //we are going to prefer the first available path.
  
  //_salCE(movementPaths); //this shows all moves, including nulls
  //_salCE(availablePaths); //this pars the array down to just the non-null values.


  if (availablePaths.length > 1 && actionOnIntersection != undefined) {
    _salCE(currentevent._SalRM_intersectionCounter);
    pathAvailableInDirection = actionOnIntersection[currentevent._SalRM_intersectionCounter]; //this action repeats for every intersection. I'd rather pass an array for options at each intersection.
    currentevent._SalRM_intersectionCounter++;
  }
  else {
    var pathAvailableInDirection = availablePaths[0]; //This should never return an empty undefined var since we do the check above. 
  }

  //if there are multiple paths, then we should get the length of array and if there are more than 1 path, pass to a decision making function based off user supplied parameters.
  currentevent.setDirection(pathAvailableInDirection); //turn toward first availablePath[0]. //We need this to do the currentevent.canPass check. //Or we could just pass in pathAvailableInDirection
  } //end the if (pathIsClear == true)  statement


  //do a check to see if the move is available (free of events or character)
  var movementAllowed = currentevent.canPass(thisX, thisY, currentevent.direction());

  if (movementAllowed) {
    currentevent._sal_routemovement.pathIsClear = true;
    currentevent.moveStraight(currentevent.direction()); //event should move direction that it is facing.
  }
  else { //the movement is blocked by an event.
    //if blocked, stop checking for new paths and wait for the path to clear.
    currentevent._sal_routemovement.pathIsClear = false;
    _salCE(currentevent._sal_routemovement.pathIsClear);


    let xvariance = 0;
    let yvariance = 0;
    if (currentevent.direction() == 2) {yvariance = -1;} //down
    if (currentevent.direction() == 4) {xvariance = -1;} //left //I had my variance the wrong negation. Does this affect my compass above?
    if (currentevent.direction() == 6) {xvariance = 1;} //right //I had my variance the wrong negation. Does this affect my compass above?
    if (currentevent.direction() == 8) {yvariance = 1;} //up

    currentevent._sal_routemovement.blockedX = currentevent.x + xvariance;
    currentevent._sal_routemovement.blockedY = currentevent.y + yvariance;
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

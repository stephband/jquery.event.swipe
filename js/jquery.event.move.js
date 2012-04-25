// jquery.event.move
//
// 1.0
//
// Stephen Band
//
// Triggers 'movestart', 'move' and 'moveend' events after
// mousemoves following a mousedown cross a distance threshold,
// similar to the native 'dragstart', 'drag' and 'dragend' events.
// Move events are throttled to animation frames. Move event objects
// have the properties:
//
// pageX:
// pageY:   Page coordinates of pointer.
// startX:
// startY:  Page coordinates of pointer at movestart.
// distX:
// distY:  Distance the pointer has moved since movestart.
// deltaX:
// deltaY:  Distance the finger has moved since last event.
// velocityX:
// velocityY:  Average velocity over last few events.


(function(jQuery, undefined){
	var threshold = 3,
	
	    add = jQuery.event.add,
	
	    remove = jQuery.event.remove,

	    // Just sugar, so we can have arguments in the same order as
	    // add and remove.
	    trigger = function(node, type, data) {
	    	jQuery.event.trigger(type, data, node);
	    },

	    // Shim for requestAnimationFrame, falling back to timer. See:
	    // see http://paulirish.com/2011/requestanimationframe-for-smart-animating/
	    requestFrame = (function(){
	    	return (
	    		window.requestAnimationFrame ||
	    		window.webkitRequestAnimationFrame ||
	    		window.mozRequestAnimationFrame ||
	    		window.oRequestAnimationFrame ||
	    		window.msRequestAnimationFrame ||
	    		function(fn, element){
	    			return window.setTimeout(function(){
	    				fn();
	    			}, 25);
	    		}
	    	);
	    })(),
	    
	    ignoreTags = {
	    	textarea: true,
	    	input: true,
	    	select: true
	    },
	    
	    mouseevents = {
	    	move: 'mousemove',
	    	cancel: 'mouseup dragstart',
	    	end: 'mouseup'
	    },
	    
	    touchevents = {
	    	move: 'touchmove',
	    	cancel: 'touchend',
	    	end: 'touchend'
	    };
	
	// Constructors
	
	function Timer(fn){
		var callback = fn,
				active = false,
				running = false;
		
		function trigger(time) {
			if (active){
				callback();
				requestFrame(trigger);
				running = true;
				active = false;
			}
			else {
				running = false;
			}
		}
		
		this.kick = function(fn) {
			active = true;
			if (!running) { trigger(); }
		};
		
		this.end = function(fn) {
			var cb = callback;
			
			if (!fn) { return; }
			
			// If the timer is not running, simply call the end callback.
			if (!running) {
				fn();
			}
			// If the timer is running, and has been kicked lately, then
			// queue up the current callback and the end callback, otherwise
			// just the end callback.
			else {
				callback = active ?
					function(){ cb(); fn(); } : 
					fn ;
				
				active = true;
			}
		};
	}
	
	// Functions
	
	function returnFalse(e) {
		return false;
	}
	
	function preventDefault(e) {
		e.preventDefault();
	}
	
	function preventIgnoreTags(e) {
		// Don't prevent interaction with form elements.
		if (ignoreTags[ e.target.tagName.toLowerCase() ]) { return; }
		
		e.preventDefault();
	}

	function isLeftButton(e) {
		// Ignore mousedowns on any button other than the left (or primary)
		// mouse button, or when a modifier key is pressed.
		return (e.which === 1 && !e.ctrlKey && !e.altKey);
	}

	function identifiedTouch(touchList, id) {
		var i, l;

		if (touchList.identifiedTouch) {
			return touchList.identifiedTouch(id);
		}
		
		// touchList.identifiedTouch() does not exist in
		// webkit yet… we must do the search ourselves...
		
		i = -1;
		l = touchList.length;
		
		while (++i < l) {
			if (touchList[i].identifier === id) {
				return touchList[i];
			}
		}
	}

	function changedTouch(e, event) {
		var touch = identifiedTouch(e.changedTouches, event.identifier);

		// This isn't the touch you're looking for.
		if (!touch) { return; }

		// Chrome Android (at least) includes touches that have not
		// changed in e.changedTouches. That's a bit annoying. Check
		// that this touch has changed.
		if (touch.pageX === event.pageX && touch.pageY === event.pageY) { return; }

		return touch;
	}

	// Handlers that decide when the first movestart is triggered
	
	function mousedown(e){
		var data;

		if (!isLeftButton(e)) { return; }

		data = {
			target: e.target,
			startX: e.pageX,
			startY: e.pageY,
			pageX: e.pageX,
			pageY: e.pageY,
			timeStamp: e.timeStamp
		};

		add(document, mouseevents.move, mousemove, data);
		add(document, mouseevents.cancel, mouseend, data);
	}

	function mousemove(e){
		var data = e.data;

		checkThreshold(e, data, e, removeMouse);
	}

	function mouseend(e) {
		removeMouse();
	}

	function removeMouse() {
		remove(document, mouseevents.move, mousemove);
		remove(document, mouseevents.cancel, removeMouse);
	}

	function touchstart(e) {
		var touch, data;

		// Don't get in the way of interaction with form elements.
		if (ignoreTags[ e.target.tagName.toLowerCase() ]) { return; }

		touch = e.changedTouches[0];
		
		// iOS live updates the touch objects whereas Android gives us copies.
		// That means we can't trust the touchstart object to stay the same,
		// so let's copy the data. This object will act as a template for
		// movestart, move and moveend events.
		data = {
			target: touch.target,
			startX: touch.pageX,
			startY: touch.pageY,
			pageX: touch.pageX,
			pageY: touch.pageY,
			timeStamp: e.timeStamp,
			identifier: touch.identifier
		};

		// Use the touch identifier as a namespace, so that we can later
		// remove handlers pertaining only to this touch.
		add(document, touchevents.move + '.' + touch.identifier, touchmove, data);
		add(document, touchevents.cancel + '.' + touch.identifier, touchend, data);
	}

	function touchmove(e){
		var data = e.data,
		    touch = changedTouch(e, data);

		if (!touch) { return; }

		checkThreshold(e, data, touch, removeTouch);
	}

	function touchend(e) {
		var data = e.data,
		    touch = identifiedTouch(e.changedTouches, data.identifier);

		if (!touch) { return; }

		removeTouch(data);
	}

	function removeTouch(touchstart) {
		remove(document, '.' + touchstart.identifier, touchmove);
		remove(document, '.' + touchstart.identifier, touchend);
	}


	// Logic for deciding when to trigger a movestart.

	function checkThreshold(e, data, touch, fn) {
		var distX = touch.pageX - data.startX,
		    distY = touch.pageY - data.startY;

		// Do nothing if the threshold has not been crossed.
		if ((distX * distX) + (distY * distY) < (threshold * threshold)) { return; }

		return triggerStart(e, data, touch, distX, distY, fn);
	}

	function triggerStart(e, data, touch, distX, distY, fn) {
		var node = data.target,
		    events, touches, time;

		// Climb the parents of this target to find out if one of the
		// move events is bound somewhere. This is an optimisation that
		// may or may not be good. I should test.
		while (node !== document.documentElement) {
			events = jQuery.data(node, 'events');
			
			// Test to see if one of the move events has been bound.
			if (events && (events.movestart || events.move || events.moveend)) {
				touches = e.targetTouches;
				time = e.timeStamp - data.timeStamp;

				// Trigger the movestart event using data, and pass data
				// for use as template for the move and moveend events.
				data.type = 'movestart';
				data.distX = distX;
				data.distY = distY;
				data.deltaX = distX;
				data.deltaY = distY;
				data.pageX = touch.pageX;
				data.pageY = touch.pageY;
				data.velocityX = distX / time;
				data.velocityY = distY / time;
				data.targetTouches = touches;
				data.finger = touches ? touches.length : 1;

				trigger(data.target, data, data);

				return fn(data);
			}
			
			node = node.parentNode;
		}
	}


	// Handlers that control what happens following a movestart

	function activeMousemove(e) {
		var event = e.data.event,
		    timer = e.data.timer;

		updateEvent(event, e, e.timeStamp, timer);
	}

	function activeMouseend(e) {
		var event = e.data.event,
		    timer = e.data.timer;
		
		removeActiveMouse();

		endEvent(event, timer, function() {
			// Unbind the click suppressor, waiting until after mouseup
			// has been handled.
			setTimeout(function(){
				remove(e.target, 'click', returnFalse);
			}, 0);
		});
	}

	function removeActiveMouse(event) {
		remove(document, mouseevents.move, activeMousemove);
		remove(document, mouseevents.end, activeMouseend);
	}

	function activeTouchmove(e) {
		var event = e.data.event,
		    timer = e.data.timer,
		    touch = changedTouch(e, event);

		if (!touch) { return; }

		// Stop the interface from gesturing
		e.preventDefault();

		event.targetTouches = e.targetTouches;
		updateEvent(event, touch, e.timeStamp, timer);
	}

	function activeTouchend(e) {
		var event = e.data.event,
		    timer = e.data.timer,
		    touch = identifiedTouch(e.changedTouches, event.identifier);

		// This isn't the touch you're looking for.
		if (!touch) { return; }

		removeActiveTouch(event);
		endEvent(event, timer);
	}

	function removeActiveTouch(event) {
		remove(document, '.' + event.identifier, activeTouchmove);
		remove(document, '.' + event.identifier, activeTouchend);
	}


	// Logic for triggering move and moveend events

	function updateEvent(event, touch, timeStamp, timer) {
		var time = timeStamp - event.timeStamp;

		event.type = 'move';
		event.distX =  touch.pageX - event.startX;
		event.distY =  touch.pageY - event.startY;
		event.deltaX = touch.pageX - event.pageX;
		event.deltaY = touch.pageY - event.pageY;
		// Average the velocity of the last few events over a decay curve
		// to even out spurious jumps in values.
		event.velocityX = 0.3 * event.velocityX + 0.7 * event.deltaX / time;
		event.velocityY = 0.3 * event.velocityY + 0.7 * event.deltaY / time;
		event.pageX =  touch.pageX;
		event.pageY =  touch.pageY;

		timer.kick();
	}

	function endEvent(event, timer, fn) {
		timer.end(function(){
			event.type = 'moveend';

			trigger(event.target, event);
			
			return fn && fn();
		});
	}


	// jQuery special event definition

	function isSetup(events) {
		return ((events.movestart ? 1 : 0) +
		        (events.move ? 1 : 0) +
		        (events.moveend ? 1 : 0)) > 1;
	}

	function setup(data, namespaces, eventHandle) {
		var events = jQuery.data(this, 'events');

		// If another move event is already setup, don't setup again.
		if (isSetup(events)) { return; }
		
		// Stop the node from being dragged
		add(this, 'dragstart.move drag.move', preventDefault);
		// Prevent text selection and touch interface scrolling
		add(this, 'mousedown.move touchstart.move', preventIgnoreTags);

		// Don't bind to the DOM. For speed.
		return true;
	}
	
	function teardown(namespaces) {
		var events = jQuery.data(this, 'events');

		// If another move event is already setup, don't setup again.
		if (isSetup(events)) { return; }
		
		remove(this, 'dragstart drag', preventDefault);
		remove(this, 'mousedown touchstart', preventIgnoreTags);

		// Don't bind to the DOM. For speed.
		return true;
	}
	
	jQuery.event.special.movestart = {
		setup: setup,
		teardown: teardown,

		_default: function(e, event) {
			var data = {
			      event: event,
			      timer: new Timer(function(time){
			        trigger(e.target, event);
			      })
			    };

			if (event.identifier === undefined) {
				// We're dealing with a mouse

				// Stop clicks from propagating during a move
				// Why? I can't remember, but it is important...
				add(e.target, 'click', returnFalse);

				add(document, mouseevents.move, activeMousemove, data);
				add(document, mouseevents.end, activeMouseend, data);
			}
			else {
				add(document, touchevents.move + '.' + event.identifier, activeTouchmove, data);
				add(document, touchevents.end + '.' + event.identifier, activeTouchend, data);
			}
		}
	};
	
	jQuery.event.special.move =
	jQuery.event.special.moveend = {
		setup: setup,
		teardown: teardown
	};

	add(document, 'mousedown.move', mousedown);
	add(document, 'touchstart.move', touchstart);
	
})(jQuery);


// Make jQuery copy touch event properties over to the jQuery event
// object, if they are not already listed. But only do the ones we
// really need.

(function(jQuery, undefined){
	var props = ["changedTouches", "targetTouches"],
	    l = props.length;
	
	while (l--) {
		if (jQuery.event.props.indexOf(props[l]) === -1) {
			jQuery.event.props.push(props[l]);
		}
	}
})(jQuery);
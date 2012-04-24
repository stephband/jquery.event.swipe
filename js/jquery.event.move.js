// jquery.event.move
// 
// 0.7
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
// deltaX:
// deltaY:  Distance the pointer has moved since movestart.

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
							fn(+new Date());
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
	
	// CONSTRUCTORS
	
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
		};
		
		this.kick = function(fn) {
			active = true;
			if (!running) { trigger(+new Date()); }
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
		}
	}
	
	// FUNCTIONS
	
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
	
	// Handlers that decide when the first movestart is triggered
	
	function mousedown(e){
		var _e = e.originalEvent,
				data, touch;
		
		// Respond only to mousedowns on the left mouse button
		if (e.type === 'mousedown' && e.which !== 1) { return; }
		
		// Respond only to single touches
		if (e.type === 'touchstart' && _e.touches.length > 1) { return; }
		
		// Don't get in the way of interaction with form elements.
		if (ignoreTags[ e.target.tagName.toLowerCase() ]) { return; }
		
		
		if (e.type === 'touchstart') {
			touch = _e.touches[0];

			data = {
				start: {
					target: e.target,
					pageX: touch.pageX,
					pageY: touch.pageY
				},
				events: touchevents,
				touchId: touch.identifier
			};
		}
		else {
			data = {
				start: {
					target: e.target,
					pageX: e.pageX,
					pageY: e.pageY
				},
				events: mouseevents,
			}
		}
		
		add(document, data.events.move, mousemove, data);
		add(document, data.events.cancel, mouseup, data);
	}
	
	function mousemove(e){
		var _e = e.originalEvent,
		    o = e.data.start,
				events = e.data.events,
				node = o.target,
				pageX, pageY,
				deltaX, deltaY,
				elem, data;
		
		if (events === touchevents) {
			touch = _e.touches[0];
			pageX = touch.pageX;
			pageY = touch.pageY;
			deltaX = touch.pageX - o.pageX;
			deltaY = touch.pageY - o.pageY;
		}
		else {
			pageX = e.pageX;
			pageY = e.pageY;
			deltaX = e.pageX - o.pageX;
			deltaY = e.pageY - o.pageY;
		}

		// Do nothing if the threshold has not been crossed
		if ((deltaX * deltaX) + (deltaY * deltaY) < (threshold * threshold)) { return; }
		
		// Climb the parents of this target.
		while (node !== document.documentElement) {
			data = jQuery.data(node, 'events');
			
			// Test to see if one of the move events has been bound.
			if (data && (data.movestart || data.move || data.moveend)) {
				
				trigger(node, {
					type: 'movestart',
					pageX: pageX,
					pageY: pageY,
					startX: o.pageX,
					startY: o.pageY,
					deltaX: deltaX,
					deltaY: deltaY,
					_events: e.data.events,
					_touchId: e.data.touchId
				});
				
				// If movestart is not cancelled, its' handlers are bound
				// to doc. By unbinding this function after the movestart
				// trigger we avoid calling teardown of the mousemove handler(s).
				remove(document, events.move, mousemove);
				remove(document, events.cancel, mouseup);
				
				return;
			}
			
			node = node.parentNode;
		}
	}
	
	function mouseup(e) {
	  var events = e.data.events;
	  
		remove(document, events.move, mousemove);
		remove(document, events.cancel, mouseup);
	}
	
	// Handlers that control what happens following a movestart
	
	function activeMousemove(e) {
		var obj = e.data.obj,
		    timer = e.data.timer,
		    events = e.data.events,
		    touch, pageX, pageY;
		
		// If more than one finger is down this is no longer a
		// move action.
		if (events === touchevents) {
			if (e.originalEvent.touches.length > 1) { return; }

			touch = e.originalEvent.touches[0];
			obj.pageX = touch.pageX;
			obj.pageY = touch.pageY;
		}
		else {
			obj.pageX = e.pageX;
			obj.pageY = e.pageY;
		}

		obj.deltaX = obj.pageX - obj.startX;
		obj.deltaY = obj.pageY - obj.startY;
		
		timer.kick();
		
		if (events === touchevents) {
			// Stop the touch interface from scrolling
			e.preventDefault();
		}
	}
	
	function activeMouseup(e) {
		var _e = e.originalEvent,
		    target = e.data.target,
		    obj = e.data.obj,
		    timer = e.data.timer,
		    events = e.data.events;
		
		// When fingers are still left on the surface, the
		// move action may not be finished yet.
		if (events === touchevents && (identifiedTouch(_e.touches, e.data.touchId))) { return; }
		
		remove(document, events.move, activeMousemove);
		remove(document, events.end, activeMouseup);
		
		timer.end(function(){
			obj.type = 'moveend';

			trigger(target, obj);
			
			if (events === mouseevents) {
				// Unbind the click suppressor, waiting until after mouseup
				// has been handled.
				setTimeout(function(){
					remove(target, 'click', returnFalse);
				}, 0);
			}
		});
	}
	
	function setup( data, namespaces, eventHandle ) {
		var elem = jQuery(this),
		    events = elem.data('events');
		
		// If another move event is already setup,
		// don't setup again.
		if (((events.movestart ? 1 : 0) +
		     (events.move ? 1 : 0) +
		     (events.moveend ? 1 : 0)) > 1) { return; }
		
		// Stop the node from being dragged
		add(this, 'dragstart.move drag.move', preventDefault);
		// Prevent text selection and touch interface scrolling
		add(this, 'mousedown.move touchstart.move', preventIgnoreTags);

		return true;
	}
	
	function teardown( namespaces ) {
		var elem = jQuery(this),
		    events = elem.data('events');
		
		// If another move event is still setup,
		// don't teardown just yet.
		if (((events.movestart ? 1 : 0) +
		     (events.move ? 1 : 0) +
		     (events.moveend ? 1 : 0)) > 1) { return; }
		
		remove(this, 'dragstart drag', preventDefault);
		remove(this, 'mousedown touchstart', preventIgnoreTags);

		return true;
	}
	
	
	// THE MEAT AND POTATOES
	
	add(document, 'mousedown.move touchstart.move', mousedown);
	
	jQuery.event.special.movestart = {
		setup: setup,
		teardown: teardown,
		_default: function(e) {
			var target = e.target,
					events = e._events || mouseevents,
					obj = {
						type: 'move',
				  	startX: e.startX,
				  	startY: e.startY,
				  	deltaX: e.pageX - e.startX,
				  	deltaY: e.pageY - e.startY
					},
					timer = new Timer(function(time){
						trigger(target, obj);
					}),
					data = {
						target: target,
						obj: obj,
						timer: timer,
						events: events,
						touchId: e._touchId
					},
					touch;
			
			if (events === mouseevents) {
				// Stop clicks from propagating during a move
				// Why? I can't remember, but it is important...
				add(e.target, 'click', returnFalse);
			}
			
			// Track pointer events
			add(document, events.move, activeMousemove, data);
			add(document, events.end, activeMouseup, data);
		}
	};
	
	jQuery.event.special.move = jQuery.event.special.moveend = {
		setup: setup,
		teardown: teardown
	};
	
})(jQuery);
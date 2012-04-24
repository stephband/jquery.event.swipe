// jQuery.event.swipe
// 0.2
// Stephen Band

// Dependencies
// jQuery.event.move

// One of swipeleft, swiperight, swipeup or swipedown is triggered on
// moveend, when the move has covered a threshold ratio of the dimension
// of the target node. The default is 0.5. It can be changed with:
// 
// jQuery.event.special.swipe.settings

(function(jQuery, undefined){
	var add = jQuery.event.add,
	   
	    remove = jQuery.event.remove,

	    // Just sugar, so we can have arguments in the same order as
	    // add and remove.
	    trigger = function(node, type, data) {
	    	jQuery.event.trigger(type, data, node);
	    },

	    // Ratio of the width (or height) of the target node must be
	    // swiped before being considered a swipe.
	    settings = {
	    	threshold: 0.5
	    };

	function returnTrue() {
		return true;
	}

	function moveend(e) {
		var w = e.target.offsetWidth,
		    h = e.target.offsetHeight;

		// Find out which of the four directions was swiped
		if (e.deltaX > e.deltaY) {
			if (e.deltaX > -e.deltaY) {
				if (e.deltaX/w > settings.threshold) {
					trigger(e.currentTarget, 'swiperight');
				}
			}
			else {
				if (e.deltaY/h < settings.threshold) {
					trigger(e.currentTarget, 'swipeup')
				}
			}
		}
		else {
			if (e.deltaX > -e.deltaY) {
				if (e.deltaY/h > settings.threshold) {
					trigger(e.currentTarget, 'swipedown');
				}
			}
			else {
				if (e.deltaX/w < settings.threshold) {
					trigger(e.currentTarget, 'swipeleft');
				}
			}
		}
	};

	function isSetup(node) {
		var events = jQuery.data(node, 'events');

		return ((events.swipe ? 1 : 0) +
			    (events.swipeleft ? 1 : 0) +
		        (events.swiperight ? 1 : 0) +
		        (events.swipeup ? 1 : 0) +
		        (events.swipedown ? 1 : 0)) > 1;
	}

	jQuery.event.special.swipe =
	jQuery.event.special.swipeleft =
	jQuery.event.special.swiperight = 
	jQuery.event.special.swipeup =
	jQuery.event.special.swipedown = {
		setup: function( data, namespaces, eventHandle ) {
			// If another swipe event is already setup, don't setup again.
			if (isSetup(this)) { return; }

			add(this, 'moveend', moveend);

			return true;
		},

		teardown: function() {
			// If another swipe event is still setup, don't teardown yet.
			if (isSetup(this)) { return; }

			remove(this, 'moveend', moveend);

			return true;
		},

		settings: settings
	};
})(jQuery);
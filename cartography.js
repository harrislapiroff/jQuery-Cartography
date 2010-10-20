(function($){
	$.fn.disableSelect = function () {
		this.each(function () {
			$(this).css({
				'-webkit-user-select':'none',
				'-moz-user-select':'none',
				'user-select':'none'
			}).bind('selectstart', function () { return false; });
		});
		return this;
	}
}(jQuery));

(new function ($) {
	
	$.fn.cartography = function (opts) {
		var
			opts = opts || {},
			// configuration variables
			WRAPPER = this,
			FULL_WIDTH = opts.width,
			FULL_HEIGHT = opts.height,
			COLUMNS = opts.cols || opts.columns,
			COLS = COLUMNS, // nice to have the option
			ROWS = opts.rows,
			FULL_IMAGE = opts.thumbnail,
			TILE_PREFIX = opts.prefix || '',
			TILE_SUFFIX = opts.suffix || '.png',
			// calculated parameters
			VIEWPORT_WIDTH = WRAPPER.width(),
			VIEWPORT_HEIGHT = WRAPPER.height(),
			TILE_WIDTH = FULL_WIDTH/COLUMNS,
			TILE_HEIGHT = FULL_HEIGHT/ROWS,
			MATRIX = [], // we'll calculate this later
			CELLS = [], // also for later (a flat version of MATRIX)
			// some HTML elements
			OUTMAP = $('<div class="jcartography-outmap" />').width(VIEWPORT_WIDTH).height(VIEWPORT_HEIGHT).appendTo(WRAPPER),
			INMAPWRAP = $('<div class="jcartography-inmapwrap" />').width(VIEWPORT_WIDTH).height(VIEWPORT_HEIGHT).appendTo(OUTMAP),
			INMAP = $('<div class="jcartography-inmap" />').width(FULL_WIDTH).height(FULL_HEIGHT).appendTo(INMAPWRAP).disableSelect(),
			STYLES = $('<style type="text/css" />').appendTo(document.head),
			EMPTY = $('<div class="jcartography-empty" />').width(VIEWPORT_WIDTH).height(VIEWPORT_HEIGHT).appendTo(OUTMAP),
			// shortcuts
			$window = $(window),
			EASEIN = ('easeInCirc' in $.easing) ? 'easeInCirc' : 'linear',
			EASEOUT = ('easeOutCirc' in $.easing) ? 'easeOutCirc' : 'linear',
			EASEINOUT = ('easeInOutCirc' in $.easing) ? 'easeInOutCirc' : 'linear',
			floor = Math.floor,
			ceil = function(n){return floor(n+1);},
			min = Math.min,
			max = Math.max,
			// we'll define these functions later
			initiate_drag, terminate_drag, map_back_to_place, drag, load_tiles,
			// some counters
			i, j, k, l, m, n; // should be out or in -- out to start with
			
		// generate the matrix
		n = 1; // keep count of the cells
		for (i = 0; i < ROWS; i++) { // for each row
			MATRIX[i] = []; // create an array for the row
			for (j = 0; j < COLS; j++) { // for each column
				MATRIX[i][j] = { // create a cell at row index i and col index j
					'row': i,
					'col': j,
					'top': i * TILE_WIDTH,
					'left': j * TILE_HEIGHT,
					'count': n,
					'image': [TILE_PREFIX, n, TILE_SUFFIX].join('') // generate the url for the image file
				};
				MATRIX[i][j].tile = $(['<div id="tile_', i, '_', j, '" />'].join('')).css({
					width: TILE_WIDTH,
					height: TILE_HEIGHT,
					position: 'absolute',
					top: MATRIX[i][j].top,
					left: MATRIX[i][j].left
				}).appendTo(INMAP);
				CELLS[n] = MATRIX[i][j];
				n++; // on to the next cell
			}
		}
		
		
		// adjust the HTML styles
		EMPTY.css({
			position: 'absolute',top:0,left:0})
		INMAPWRAP.css({
			'overflow': 'hidden'
		});
		INMAP.css({
			'position': 'relative',
			'top': 0,
			'left': 0
		});
		
		// add the drag event
		initiate_drag = function (e) {
			drag.xcache = e.clientX;
			drag.ycache = e.clientY;
			INMAP.stop();
			$window.bind('mousemove.cartodrag',drag)
			WRAPPER.trigger('movestart');
		};
		terminate_drag = function (e) {
			var x_per_ms = drag.xmotion / drag.timedelta,
				y_per_ms = drag.ymotion / drag.timedelta;
			// make sure the ratio has changed--else they've just clicked
			if(drag.last_x_ratio !== x_per_ms && drag.last_y_ratio !== y_per_ms){
				INMAP.animate({
					top: INMAP.position().top + 1000*y_per_ms,
					left: INMAP.position().left + 1000*x_per_ms,
				}, {
					duration: 2000,
					easing: EASEOUT,
					step: (function(){WRAPPER.trigger('mapmove')}),
					complete: (function(){WRAPPER.trigger('movecomplete');})	
				});
			// otherwise stop the map from moving and trigger movecomplete
			}else{
				WRAPPER.trigger('movecomplete');
			}
			drag.last_x_ratio = drag.xmotion / drag.timedelta;
			drag.last_y_ratio = drag.xmotion / drag.timedelta;
			$window.unbind('mousemove.cartodrag');
		};
		drag = function (e) {
			var xmotion = drag.xmotion = e.clientX - drag.xcache,
				ymotion = drag.ymotion = e.clientY - drag.ycache,
				time = new Date().valueOf();
				drag.timedelta = time - drag.capturetime;
				drag.capturetime = time;
			INMAP.stop();
			INMAP.css({
				top: parseInt(INMAP.css('top')) + ymotion,
				left: parseInt(INMAP.css('left')) + xmotion
			});
			drag.xcache = e.clientX;
			drag.ycache = e.clientY;
			WRAPPER.trigger('mapmove');
		};
		map_back_to_place = function () {
			var top_min = INMAP.position().top > 0,
				left_min = INMAP.position().left > 0,
				top_max = INMAP.position().top < -FULL_HEIGHT + VIEWPORT_HEIGHT,
				left_max = INMAP.position().left < -FULL_WIDTH + VIEWPORT_WIDTH;
			//if(top_min || left_min || top_max || left_max){
			//	INMAP.stop();
			//}
			if(top_min){
				INMAP.animate({
					top:0
				}, {duration: 250, easing: EASEOUT, queue: false, step: (function(){WRAPPER.trigger('mapmove');}), complete: (function(){WRAPPER.trigger('movecomplete');}) });
			}
			if(left_min){
				INMAP.animate({
					left:0
				}, {duration: 250, easing: EASEOUT, queue: false, step: (function(){WRAPPER.trigger('mapmove');}), complete: (function(){WRAPPER.trigger('movecomplete');})});
			}
			if(top_max){
				INMAP.animate({
					top: -FULL_HEIGHT + VIEWPORT_HEIGHT
				}, {duration: 250, easing: EASEINOUT, queue: false, step: (function(){WRAPPER.trigger('mapmove');}), complete: (function(){WRAPPER.trigger('movecomplete');})});
			}
			if(left_max){
				INMAP.animate({
					left:-FULL_WIDTH + VIEWPORT_WIDTH
				}, {duration: 250, easing: EASEINOUT, queue: false, step: (function(){WRAPPER.trigger('mapmove');}), complete: (function(){WRAPPER.trigger('movecomplete');})});
			}
		};
		// determine which tiles to load and load them
		load_tiles = function () {
			var top_corner = INMAP.position(),
				bottom_corner = {top: top_corner.top - VIEWPORT_HEIGHT, left: top_corner.left - VIEWPORT_WIDTH},
				img, i, j;
				// select all the tiles in range with a 1 tile buffer around them
				i_min = max(0, floor(-top_corner.top/TILE_HEIGHT)-1),
				i_max = min(ROWS - 1, ceil(-bottom_corner.top/TILE_HEIGHT)+1),
				j_min = max(0, floor(-top_corner.left/TILE_WIDTH)-1),
				j_max = min(COLS - 1, ceil(-bottom_corner.left/TILE_WIDTH)+1);
			// grid forloop... double-double
			for (i = i_min; i <= i_max; i++){ for (j = j_min; j <= j_max; j++){
					// if there's not currently an image in the tile
					if( $('img', MATRIX[i][j].tile).size() === 0 ){
						// put the image there
						img = $(['<img src="',MATRIX[i][j].image,'" />'].join(''));
						img.load(function(){
							$(this).parent().removeClass('jcartography-loading');
						});
						MATRIX[i][j].tile.html(img).addClass('jcartography-loading');
					}
			} } // end of the grid forloop
			
			// another double forloop -- unload the images in any tiles that aren't visible
			for(i = 0; i < ROWS; i++){ for (j = 0; j < COLS; j++) {
				if( i < i_min || i > i_max || j < j_min || j > j_max ){
					MATRIX[i][j].tile.html('');
				}
			} } // end another double forloop
			
		};
		
		WRAPPER.bind('movecomplete', map_back_to_place)
		WRAPPER.bind('mapmove', load_tiles);
		OUTMAP.bind('mousedown.cartodrag', initiate_drag);
		$window.bind('mouseup.cartodrag', terminate_drag);
		
		// add some CSS
		
		STYLES.html([
			'.jcartography-outmap{',
			'cursor:move;',
			'position:relative;',
			'background:#666;',
			'}',
			'.jcartography-inmap{',
			'border:1px solid #CCC;',
			'margin:-1px;',
			'}',
			'.jcartography-loading{',
			'background:#EEE;',
			'}'
		].join(''));
		
		// let's put some data on the element for debugging, &c.
		WRAPPER.data('cartography_matrix', MATRIX);
		
		// do the intial tile load
		load_tiles();
		
		// allow chaining
		return this;
		
	};

}(jQuery));
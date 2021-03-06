/*
 * mobile support unit tests
 */

(function( $ ) {
	$.testHelper = {
		// This function takes sets of files to load asynchronously. Each set will be loaded after
		// the previous set has completed loading. That is, each require and it's dependencies in a
		// set will be loaded asynchronously, but each set will be run in serial.
		asyncLoad: function( seq ) {
			require({
				baseUrl: "../../../js"
			});

			function loadSeq( seq, i ){
				if( !seq[i] ){
					QUnit.start();
					return;
				}

				require( seq[i], function() {
					loadSeq(seq, i + 1);
				});
			}

			// stop qunit from running the tests until everything is in the page
			QUnit.config.autostart = false;

			loadSeq( seq, 0 );
		},

		excludeFileProtocol: function(callback){
			var message = "Tests require script reload and cannot be run via file: protocol";

			if (location.protocol == "file:") {
				test(message, function(){
					ok(false, message);
				});
			} else {
				callback();
			}
		},

		// TODO prevent test suite loads when the browser doesn't support push state
		// and push-state false is defined.
		setPushState: function() {
			if( $.support.pushState && location.search.indexOf( "push-state" ) >= 0 ) {
				$.support.pushState = false;
			}
		},

		reloads: {},

		reloadModule: function(libName){
			var deferred = $.Deferred();
			if(this.reloads[libName] === undefined) {
				this.reloads[libName] = {
					count: 0
				};
			}

			require(
				{
					baseUrl: "../../../js",
					context: libName+"_"+this.reloads[libName].count++
				}, [libName],
				function() {
					deferred.resolve();
				}
			);

			return deferred;
		},

		reloadLib: function(libName){
			if(this.reloads[libName] === undefined) {
				this.reloads[libName] = {
					lib: $("script[src$='" + libName + "']"),
					count: 0
				};
			}

			var lib = this.reloads[libName].lib.clone(),
				src = lib.attr('src');

			//NOTE append "cache breaker" to force reload
			lib.attr('src', src + "?" + this.reloads[libName].count++);
			$("body").append(lib);
		},

		rerunQunit: function(){
			var self = this;
			QUnit.init();
			$("script:not([src*='.\/'])").each(function(i, elem){
				var src = elem.src.split("/");
				self.reloadLib(src[src.length - 1]);
			});
			QUnit.start();
		},

		alterExtend: function(extraExtension){
			var extendFn = $.extend;

			$.extend = function(object, extension){
				// NOTE extend the object as normal
				var result = extendFn.apply(this, arguments);

				// NOTE add custom extensions
				result = extendFn(result, extraExtension);
				return result;
			};
		},

		hideActivePageWhenComplete: function() {
			if( $('#qunit-testresult').length > 0 ) {
				$('.ui-page-active').css('display', 'none');
			} else {
				setTimeout($.testHelper.hideActivePageWhenComplete, 500);
			}
		},

		openPage: function(hash){
			location.href = location.href.split('#')[0] + hash;
		},

		sequence: function(fns, interval){
			$.each(fns, function(i, fn){
				setTimeout(fn, i * interval);
			});
		},

		pageSequence: function(fns){
			this.eventSequence("pagechange", fns);
		},

		eventSequence: function(event, fns, timedOut){
			var fn = fns.shift(),
					self = this;

			if( fn === undefined ) return;

			// if a pagechange or defined event is never triggered
			// continue in the sequence to alert possible failures
			var warnTimer = setTimeout(function(){
				self.eventSequence(event, fns, true);
			}, 2000);

			// bind the recursive call to the event
			$.mobile.pageContainer.one(event, function(){
				clearTimeout(warnTimer);

				// Let the current stack unwind before we fire off the next item in the sequence.
				// TODO setTimeout(self.pageSequence, 0, [fns, event]);
				setTimeout(function(){ self.eventSequence(event, fns); }, 0);
			});

			// invoke the function which should, in some fashion,
			// trigger the defined event
			fn(timedOut);
		},

		deferredSequence: function(fns) {
			var fn = fns.shift(),
				deferred = $.Deferred(),
				self = this;

			if (fn) {
				res = fn();
				if ( res && $.type( res.done ) === "function" ) {
					res.done(
						function() {
							self.deferredSequence( fns ).done(
								function() {
									deferred.resolve();
								}
							);
						}
					)
				} else {
					self.deferredSequence( fns ).done(
						function() {
							deferred.resolve();
						}
					);

				}
			} else {
				deferred.resolve();
			}
			return deferred;
		},

		decorate: function(opts){
			var thisVal = opts.self || window;

			return function(){
				var returnVal;
				opts.before && opts.before.apply(thisVal, arguments);
				returnVal = opts.fn.apply(thisVal, arguments);
				opts.after && opts.after.apply(thisVal, arguments);

				return returnVal;
			};
		},

		assertUrlLocation: function( args ) {
			var parts = $.mobile.path.parseUrl( location.href ),
				pathnameOnward = location.href.replace( parts.domain, "" );

			if( $.support.pushState ) {
				same( pathnameOnward, args.hashOrPush || args.push, args.report );
			} else {
				same( parts.hash, "#" + (args.hashOrPush || args.hash), args.report );
			}
		}
	};
})(jQuery);

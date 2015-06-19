import Ember from 'ember';

export default Ember.Component.extend({

  /**
   The CSS properties for the 'spotlight' element over the current target element

   @property spotlightCSS
   @type String
   */

  spotlightCSS: '',

  /**
   The point at which the tour will start

   @property firstTourStep
   @type Integer
   @default 0
   */

  firstTourStep: 0,

  /**
   The number of the active stop stop

   @property currentStopStep
   @type Integer
   @default null
   */

  currentStopStep: null,

  /**
   Set to true if the tour is between stops

   @property transitioning
   @type Integer
   @default false
   */

  transitioning: false,

  /**
   The previous tour stop

   @property previousStop
   @type previousStop
   @default null
   */

  previousStop: null,

  /**
   When in transition, the stop to which the tour is transitioning

   @property transitionStop
   @type Object
   @default null
   */

  transitionStop: null,

  /**
   The height of the window

   @property windowHeight
   @type Integer
   */

  windowHeight: null,

  /**
   The width of the window

   @property windowWidth
   @type Integer
   */

  windowWidth: null,

  /**
   @property tourStops
   @type Object
   */

  tourStops: Ember.computed.alias('model.tourStops'),

  /**
   The Ember currentPath

   @property currentPath
   @type String
   */

  currentPath: Ember.computed.alias('parentView.controller.currentPath'),

  /**
   Set to true when the tour has been started.

   @property started
   @type Boolean
   */

  started: Ember.computed.alias('parentView.controller.tourStarted'),

  /**
   The model of the tour

   @property model
   @type Object
   */

  model: Ember.computed.alias('parentView.controller.tour'),

  /**
   Starts the tour when `started` is changed to true
   @private
   @method _startTour
   */

  _startTour: (function(){
    if(this.get('started')){
      this.setProperties({
        transitionStop: null,
        currentStop: null
      });
      var startingStep = this.get('firstTourStep') || 0;

      this.set('currentStopStep', startingStep);
      this.notifyPropertyChange('currentStopStep');
    }
  }).observes('started'),

  /**
   Set to true if there are stops after the `currentStop` in `tourStops`

   @property moreForwardSteps
   @type Boolean
   */

  moreForwardSteps: Ember.computed('currentStopStep', 'sortedTourStops',
    function(){
      return this.get('currentStopStep') + 1 < this.get('sortedTourStops.length');
    }
  ),

  /**
   Set to true if there are stops before the `currentStop` in `tourStops`

   @property moreBackwardStops
   @type Boolean
   */

  moreBackwardSteps: Ember.computed('currentStopStep',
    function(){
      return this.get('currentStopStep') > 0;
    }
  ),

  /**
   When the current path changes, call a check to see if the user changed the path

   @method pathChange
   */

  pathChange: (function(){
    if(this.get('currentStop') && this.get('started')) {
      Ember.run.scheduleOnce('afterRender', this, this._checkForUserInitiatedTransition);
    }
  }).observes('currentPath'),


  /**
   Exits the tour if the user initiated a route change, instead of the tour. Checks to see
   if the target element is still in the page after the transition; if not the tour ends.

   @method _checkForUserInitiatedTransition
   */

  _checkForUserInitiatedTransition: (function(){
    var transitioning = this.get('transitioning');
    var element = this.get('currentStop.element');
    var elementOnPage = $(element);
    if (!transitioning && Ember.isBlank(elementOnPage)) {
      this.exitTour();
    }
  }),

  /**
   The tour's stops, sorted by the step number

   @property sortedTourStops
   @type Object
   */

  sortedTourStops: Ember.computed('tourStops',
    function(){
      var tourStops = this.get('tourStops');
      if(tourStops && tourStops.get('length')){
        return tourStops.sortBy('step');
      }
    }
  ),

  /**
   When the `currentStopStep` changes, the transitionStop is set to the object at that position.

   @private
   @method _setTransitionStop
   */

  _setTransitionStop: (function(){
      var step = this.get('currentStopStep');
      var transitionStop = this.get('sortedTourStops').objectAt(step);
      this.set('transitionStop', transitionStop);
    }
  ).observes('currentStopStep'),

  /**
   Observes when the transitonStop changes, and initiates the transition to that stop.

   @private
   @method _startTourStopTransition
   */

  _startTourStopTransition: (function(){
    var transitionStop = this.get('transitionStop'),
      currentStop = this.get('currentStop');

    if(currentStop){
      currentStop.set('active', false);
    }

    if(transitionStop) {
      this.set('transitioning', true);

      var previousStop = this.get('previousStop'),
        targetRoute = transitionStop.get('targetRoute'),
        router = this.container.lookup('router:main').router,
        renderedProperty = 'lastRenderedTemplate',
        targetElement = transitionStop.get('element'),
        route;

      var allRoutes = Ember.keys(router.recognizer.names);
      var routeExists = allRoutes.indexOf(targetRoute) !== -1;

      if (routeExists) {
        route = this.container.lookup('route:' + targetRoute);
      }

      var currentRouteDifferent = !previousStop || previousStop.get('targetRoute') !== targetRoute;
      var routePresent = routeExists && route.get(renderedProperty);

      if (routeExists && (!routePresent || currentRouteDifferent)) {
        route.transitionTo(targetRoute);
        if (targetElement) {
          this._finishWhenElementInPage(targetElement);
        } else {
          this._finishTransition();
        }
      } else {
        this._finishTransition();
      }
    }
  }).observes('transitionStop'),

  /**
   Waits for the target element to render before finishing the transition. If it times out, it initiates
   the transition to the next stop.

   @private
   @param element {Object} the target element
   @param waitTime {Integer} the length of time before timing out
   */

  _finishWhenElementInPage: function(element, waitTime) {
    var component = this;
    if(!(typeof waitTime === "number")){
      waitTime = 5000
    }
    if(!Ember.isBlank($(element))){
      this._finishTransition();
    } else if(waitTime > 0) {
      Ember.run.later(function () {
        component._finishWhenElementInPage(element, waitTime - 20);
      },20);
    } else {
      this.incrementProperty('currentStopStep');
    }
  },

  /**
   Moves the `currentStop` to `previousStop`, and the `transitionStop` to the `currentStop`.
   Also activates the (soon to be) `currentStop`

   @private
   @method _finishTransition
   */

  _finishTransition: function() {
    var transitionStop = this.get('transitionStop'),
      currentStop = this.get('currentStop');

    transitionStop.set('active', true);
    this.setProperties({
      currentStop: transitionStop,
      previousStop: currentStop
    });

    Ember.run.scheduleOnce('afterRender', this, function(){this.set('transitioning', false)});
  },

  /**
   Initializes a listener to track window height and width

   @private
   @method _windowSize
   */

  _windowSize: (function(){
    var component = this;

    component.setProperties({
      windowWidth: $(window).width(),
      windowHeight: $(window).height()
    });

    if(this.get('started')){
      Ember.$(window).on('resize.tour', function(){
        Ember.run(function() {

          component.setProperties({
            windowWidth: $(window).width(),
            windowHeight: $(window).height()
          });
        });
      });
      Ember.$(window).on('scroll.tour', function(){
        component.set('scrollTop', $(window).scrollTop());
      });
    } else {
      Ember.$(window).off('resize.tour');
      Ember.$(window).off('scroll.tour');
    }
  }).observes('started').on('init'),

  /**
   Deactivates the tour and sends action `endTour`

   @method exitTour
   */

  exitTour: function(){
    this.set('started', false);
    this.set('transitionStop.active', false);
    this.set('currentStop.active', false);
    this.set('previousStop', null);
    this.sendAction('endTour');
  },

  actions: {
    /**
     Exits the tour

     @method exitTour
     */

    exitTour: function(){
      this.exitTour();
    },

    /**
     Move forward by 1

     @method advance
     */

    advance: function(){
      this.incrementProperty('currentStopStep', 1);
    },

    /**
     Move back by 1

     @method reverse
     */

    reverse: function(){
      this.decrementProperty('currentStopStep', 1);
    },

    /**
     Go to a specific stop number in the tour
     @method goToStep
     @param number {Integer} the position of the stop
     */

    goToStep: function(number){
      this.set('currentStopStep', number);
    },

    /**
     Go to a stop by id
     @method goToStop
     @param id
     */

    goToStop: function(id){
      var sortedTourStops = this.get('sortedTourStops');
      var tourStop = sortedTourStops.findBy('id', id);
      var position = sortedTourStops.indexOf(tourStop);
      this.set('currentStopStep', position);
    }
  }

});

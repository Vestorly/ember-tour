import Ember from 'ember';

export default Ember.Component.extend({

  /**
   Set to true if the tour stop is in use

   @property active
   @type Boolean
   @default false
   */

  active: Ember.computed.alias('model.active'),

  /**
   The DOM element that this stop points at.

   @property targetElement
   @type Object
   */

  targetElement: Ember.computed('model.element', 'active',
    function(){
      var elementName = this.get('model.element');
      return $(elementName)[0] || $('body')[0];
    }
  ),

  /**
   The target element's position on the page
   ```
   {
     top: xx,
     bottom: xx,
     left: xx,
     right: xx,
     height: xx,
     width: xx
   }
   ```

   @property targetElementPosition
   @type Object
   */

  targetElementPosition: Ember.computed('targetElement', 'windowHeight', 'windowWidth', 'scrollTop',
    function () {
      var elt = this.get('targetElement');
      var position = elt.getBoundingClientRect();

      if(!(position.bottom + position.height + position.left + position.right + position.top + position.width > 0)){
        position = $('body')[0].getBoundingClientRect();
      }

      return position;
    }
  ),

  /**
   Sets the tooltip position in relation to the target element.

   @private
   @function _calculateTooltipOffset
   */

  _calculateTooltipOffset: (function(){
    Ember.run.scheduleOnce('afterRender', this, function(){
      var tooltip = this.$('.tour-tooltip')[0],
        offset;
      if(tooltip){
        offset = tooltip.getBoundingClientRect();
      } else {
        offset = {
          height: this.get('windowHeight') + 10,
          width: this.get('windowWidth') + 20
        }
      }
      this.set('tooltipOffset', offset);
    });
  }).observes('windowHeight', 'windowWidth', 'scrollTop', 'active').on('didInsertElement'),

  /**
   The offset of the tooltip from its container. It equals the target element width and height,
   unless the tooltip will float on the page.

   ```
   {
     top: xx,
     bottom: xx,
     left: xx,
     right: xx,
     height: xx,
     width: xx
   }
   ```

   @property tooltipOffset
   @type Object
   */

  tooltipOffset: {},

  /**
   The css that will be applied to the tooltip box, depending on its position relative to the target element

   @property tooltipCSS
   @type String
   */

  tooltipCSS: Ember.computed('calculatedPosition',
    function(){
      var position = this.get('calculatedPosition');
      return this.get(position + 'CSS')
    }
  ),

  /**
   Depending on the 'headroom', the position where the tooltip will be shown. It will use the specified
   position if available. If not, it cycles through the other available positions, using 'floating' if
   nothing else is available.

   @property calculatedPosition
   @type String
   */

  calculatedPosition: Ember.computed('model.position', 'topAvailable', 'bottomAvailable', 'leftAvailable', 'rightAvailable',
    function(){
      var desiredPosition = this.get('model.position');
      var position;
      var availablePositions = [
        {position: 'top', available: this.get('topAvailable')},
        {position: 'bottom', available: this.get('bottomAvailable')},
        {position: 'left', available: this.get('leftAvailable')},
        {position: 'right', available: this.get('rightAvailable')}
      ];
      if(this.get(desiredPosition + 'Available')){
        position = desiredPosition;
      } else if(availablePositions.findBy('available')) {
        var availablePosition = availablePositions.findBy('available');
        position = availablePosition['position'];
      } else {
        position = 'floating';
      }
      return position;
    }
  ),

  /**
   Set to true if the `calculatedPosition` is 'right'
   @property right
   @type Boolean
   */

  right: Ember.computed.equal('calculatedPosition','right'),

  /**
   Set to true if the `calculatedPosition` is 'left'
   @property left
   @type Boolean
   */

  left: Ember.computed.equal('calculatedPosition','left'),

  /**
   Set to true if the `calculatedPosition` is 'bottom'
   @property bottom
   @type Boolean
   */

  bottom: Ember.computed.equal('calculatedPosition','bottom'),

  /**
   Set to true if the `calculatedPosition` is 'top'
   @property top
   @type Boolean
   */

  top: Ember.computed.equal('calculatedPosition','top'),

  /**
   CSS to horizontally center the popover on the target element.

   @property centeredCSS
   @type String
   */

  centeredCSS: Ember.computed('targetElementPosition', 'tooltipOffset',
    function(){
      var targetElementPosition = this.get('targetElementPosition');
      var tooltipOffset = this.get('tooltipOffset');
      return 'left:' + (targetElementPosition.width / 2 - tooltipOffset.width / 2) + 'px;';
    }
  ),

  /**
   CSS to float the tooltip in the center of the page

   @property floatingCSS
   @type String
   */

  floatingCSS: Ember.computed('tooltipOffset',
    function(){
      var tooltipOffset = this.get('tooltipOffset');
      if(!tooltipOffset){return ''}
      return 'left:50%;top:50%;margin-left:-' + (tooltipOffset.width / 2) + 'px;margin-top:-' + (tooltipOffset.height / 2) + 'px;';
    }
  ),

  /**
   Tooltip CSS to use if `calculatedPosition` is `'bottom'`

   @property bottomCSS
   @type String
   */

  bottomCSS: Ember.computed('tooltipOffset', function(){
    var tooltipHeight = this.get('tooltipOffset.height');
    return this.get('centeredCSS') + 'bottom:-' + (tooltipHeight + 10) + 'px;'
  }),

  /**
   Tooltip CSS to use if `calculatedPosition` is `'top'`

   @property topCSS
   @type String
   */

  topCSS: Ember.computed('tooltipOffset', function(){
    var tooltipHeight = this.get('tooltipOffset.height');
    return this.get('centeredCSS') + 'top:-' + (tooltipHeight + 10) + 'px;';
  }),

  /**
   Tooltip CSS to use if 'calculatedPosition' is 'right'

   @property rightCSS
   @type String
   */

  rightCSS: Ember.computed('targetElementPosition', 'tooltipOffset', 'windowHeight',
    function(){
      var targetElementPosition = this.get('targetElementPosition');
      var tooltipHeight = this.get('tooltipOffset.height');
      var windowHeight = this.get('windowHeight');
      var left = 'left:' + (targetElementPosition.width + 20) + 'px;';

      if (targetElementPosition.top + tooltipHeight > windowHeight) {
        // In this case, right would have fallen below the bottom of the screen.
        return left + 'top:' + this.get('respondingTop') + "px;";
      } else {
        return left;
      }
    }
  ),

  /**
   Tooltip CSS to use if `calculatedPosition` is `'left'`

   @property leftCSS
   @type String
   */

  leftCSS: Ember.computed('targetElementPosition', 'tooltipOffset', 'windowHeight',
    function(){
      var targetElementPosition = this.get('targetElementPosition');
      var tooltipHeight = this.get('tooltipOffset.height');
      var windowHeight = this.get('windowHeight');

      var right = 'right:' + (targetElementPosition.width + 20) + 'px;';
      if (targetElementPosition.top + tooltipHeight > windowHeight) {
        // In this case, left would have fallen below the bottom of the screen.

        return right + "top:" + this.get('respondingTop') + "px;";
      } else {
        return right;
      }
    }
  ),

  /**
   The top of the tooltip that is either
     - top of tooltip even with bottom of target element
     - bottom of tooltip even with bottom of target element

   @property respondingTop
   @type String
   */

  respondingTop: Ember.computed('targetElementPosition', 'tootipOffset', 'windowHeight',
    function(){
      var targetElementPosition = this.get('targetElementPosition');
      var tooltipHeight = this.get('tooltipOffset.height');
      var windowHeight = this.get('windowHeight');
      // Modify so that the tooltip stays in view until the element is off screen
      var alignedWithWindow = windowHeight - (targetElementPosition.top + tooltipHeight);
      var alignedWithEltBottom = (targetElementPosition.height - tooltipHeight);

      // align with window as long as element is still on screen, else align with bottom of element
      return Math.max(alignedWithWindow, alignedWithEltBottom);
    }
  ),

  /**
   Set to true if 'top' is an available position for the tooltip

   @property topAvailable
   @type Boolean
   */

  topAvailable: Ember.computed('tooltipOffset', 'targetElementPosition',
    function(){
      var targetElementPosition = this.get('targetElementPosition');
      var tooltipOffset = this.get('tooltipOffset');
      return targetElementPosition.top > tooltipOffset.height;
    }
  ),

  /**
   Set to true if 'bottom' is an available position for the tooltip

   @property bottomAvailable
   @type Boolean
   */

  bottomAvailable: Ember.computed('tooltipOffset', 'targetElementPosition', 'windowHeight',
    function(){
      var targetElementPosition = this.get('targetElementPosition');
      var tooltipOffset = this.get('tooltipOffset');
      var windowHeight = this.get('windowHeight');
      return (targetElementPosition.height + targetElementPosition.top + tooltipOffset.height) < windowHeight;
    }
  ),

  /**
   Set to true if 'left' is an available position for the tooltip

   @property leftAvailable
   @type Boolean
   */

  leftAvailable: Ember.computed('tooltipOffset', 'targetElementPosition',
    function(){
      var targetElementPosition = this.get('targetElementPosition');
      var tooltipOffset = this.get('tooltipOffset');
      return targetElementPosition.left > tooltipOffset.width;
    }
  ),

  /**
   Set to true if 'right' is an available position for the tooltip

   @property rightAvailable
   @type Boolean
   */

  rightAvailable: Ember.computed('tooltipOffset', 'targetElementPosition', 'windowWidth',
    function(){
      var targetElementPosition = this.get('targetElementPosition');
      var tooltipOffset = this.get('tooltipOffset');
      var windowWidth = this.get('windowWidth');
      return targetElementPosition.width + targetElementPosition.left + tooltipOffset.width < windowWidth;
    }
  ),

  /**
   Sets the Ember Tour's spotlight css to be the same as this stop's CSS

   @function _setSpotlightCSS
   @private
   */

  _setSpotlightCSS: (function () {
    if (this.get('active')) {
      this.set('spotlightCSS', this.get('targetOutlineCss'));
    }
  }
  ).observes('active','targetOutlineCss', 'targetElement'),

  /**
   Scrolls to the target element if it is out of the viewport

   @method scrollToElement
   */

  scrollToElement: (function () {
    var offset = this.get('targetElementPosition');

    if (offset && this.get('active') && !this.get('inViewport') && this.get('options.scrollToElement') === true) {
      var winHeight = Ember.$(window).height(),
        top = offset.bottom - (offset.bottom - offset.top),
        bottom = offset.bottom - winHeight;

      //Scroll up
      if (top < 0 || offset.height > winHeight) {
        window.scrollBy(0, top - 30); // 30px padding from edge to look nice

        //Scroll down
      } else {
        window.scrollBy(0, bottom + 100); // 70px + 30px padding from edge to look nice
      }
    }
  }).observes('active').on('init'),

  /**
   Set to true if target element is within the window

   @property inViewport
   @type Boolean
   */

  inViewport: Ember.computed('active',
    function() {
      var offset = this.get('targetElementPosition');

      return (
      offset.top >= 0 &&
      offset.left >= 0 &&
      (offset.bottom + 80) <= window.innerHeight && // add 80 to get the text right
      offset.right <= window.innerWidth
      );
    }
  ),

  /**
   The box bounding the position of the target element. Returns css with adjustments for padding, or
   'top:50%;left:50%' if the tooltip will be centered on the page

   @property targetOutlineCss
   @type String
   */

  targetOutlineCss: Ember.computed('targetElementPosition', 'active',
    function(){
      var elementPosition = this.get('targetElementPosition'),
        widthHeightPadding = 10;

      if (this.get('model.position') === 'floating') {
        widthHeightPadding = 0;
      }

      //set new position to helper layer
      if(elementPosition) {
        return 'width: ' + (elementPosition.width + widthHeightPadding) + 'px; ' +
          'height:' + (elementPosition.height + widthHeightPadding) + 'px; ' +
          'top:' + (elementPosition.top - widthHeightPadding / 2) + 'px;' +
          'left: ' + (elementPosition.left - widthHeightPadding / 2) + 'px;';
      } else {
        return 'top:50%;left:50%';
      }
    }
  ),

  actions: {
    /**
     Calls `exitTour` on the parent

     @method exitTour
     */

    exitTour: function(){
      this.get('parentView').exitTour();
    }
  }

});

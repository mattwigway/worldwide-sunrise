/*
   Copyright 2012 Matt Conway

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
   */

Sunrise = function (element, lat, lng) {
    var instance = this;
    this.width = 940; 
    this.height = 600;
    this.lat = lat;
    this.lng = lng;
    this.year = 2012; // note this matches the Julian day in getEnvelope

    this.svg = d3.select('#' + element)
        .append('svg')
        .attr('width', this.width)
        .attr('height', this.height)
        .append('g')
        .attr('transform', 'translate(0, -' + (this.height / 2) + ')');

    // draw the hour lines behind the envelope
    // noon is blank because it is behind the 'Jan' label
    var hours = ['12a', '3a', '6a', '9a', '', '3p', '6p', '9p', '12a'];
    
    var hourScale = d3.scale.linear()
	.domain([0, 8])
	.range([0, this.height]);

    var hourEnter = this.svg.append('g')
	.attr('transform', 'translate(0, ' + this.height / 2 + ')')
	.selectAll('g.hourLine')
	.data(hours)
	.enter().append('g')
	.attr('class', 'hourLine');
   
    hourEnter.append('polyline')
	.attr('shape-rendering', 'crispEdges')
	.attr('stroke', '#777777')
	.attr('points', function (d, i) {
	    var y = hourScale(i);
	    return '0,' +  y + ' ' + instance.width + ',' + y;
	});

    hourEnter.append('text')
	.attr('transform', function (d, i) {
	    return 'translate(0,' + (hourScale(i) - 2)  + ')';
	})
	.text(String);

    this.yScale = d3.scale.linear()
        .domain([-12, 12])
        .range([0, this.height]);

    this.xScale = d3.scale.linear()
    // 2012 - the example year - is a leap year
        .domain([0, 365])
        .range([0, this.width]);

    this.area = d3.svg.area()
        // X position: linear by day of year
        .x(function(d, i) { return this.xScale(i); })
        // an envelope
        .y0(function(d) { return this.yScale(-1 * d / 2 + 12); })
        .y1(function(d) { return this.yScale(d / 2 + 12); });

    // will be filled out later, in drawEnvelope()
    this.path = this.svg.append('path')
        .attr('class', 'envelope')
        .style('fill', '#dddd66')
	.attr('opacity', '0.9');

    // labels, numbers are the start day of each month, for proper scaling
    // I support constant-length months, or perhaps months should be abolished
    var months = [
	['Jan', 0],
	['Feb', 31],
	['Mar', 60],
	['Apr', 91],
	['May', 122],
	['Jun', 153],
	['Jul', 183],
	['Aug', 214],
        ['Sep', 245],
	['Oct', 275],
	['Nov', 306],
	['Dec', 336]
	];

    var labelEnter = this.svg.append('g')
        .attr('transform', 'translate(0, ' + this.height + ')')
        .selectAll('g')
        .data(months)
        .enter().append('g');

    
    labelEnter.append('text')
        .text(function (d) { return d[0]; })
        .attr('transform', function (d) {
	    // translate according to varying month length
            return 'translate(' + instance.xScale(d[1]) + ', 0)';
        });

    labelEnter.append('polyline')
        .attr('stroke', '#bbbbbb')
	.attr('shape-rendering', 'crispEdges')
        .attr('points', function (d) {
	    // varying month length
            var x = instance.xScale(d[1]);
            var span = instance.height / 32;
            return x + ',' + span + ' ' + x + ',-' + span;
        });

    this.popOver = instance.svg.append('g');

    // background
    this.popOver.append('rect')
        .attr('x', '0').attr('y', '0') // later translated
        .attr('width', '300')
        .attr('height', '120')
        .attr('rx', '15') // rounded corners
        .attr('fill', '#dfdddd')
        .attr('opacity', '.8');
    

    // build up the data window
    this.popOver.append('text').attr('id', 'date')
        .attr('transform', 'translate(30, 30)');
    this.popOver.append('text').text('Sunrise: ')
        .attr('transform', 'translate(30, 50)');
    this.popOver.append('text').attr('id', 'rise')
        .attr('transform', 'translate(90, 50)');
    this.popOver.append('text').text('Sunset: ')
        .attr('transform', 'translate(30, 70)');
    this.popOver.append('text').attr('id', 'set')
        .attr('transform', 'translate(90, 70)');

    this.popOver.append('text').text('Note: times relative to solar noon')
        .attr('transform', 'translate(30, 90)');

    this.currentDate = instance.svg.append('polyline')
        .attr('class', 'currentDay')
        .attr('transform', 'translate(0,' + (instance.height / 2) + ')')
        .attr('stroke', '#aaaaaa')
        .attr('shape-rendering', 'crispEdges')
        .attr('pointer-events', 'none'); // prevent mouseout bubbling to path

    this.path.on('mousemove', function (d) {
        var x = d3.mouse(this)[0];
        // get the day number, adding 1 to map from 1 to 366 not 0 to 365
        // match how JavaScript does it.
        var dayOfYear = Math.round(instance.xScale.invert(x)) + 1;

        // Jan 1, 2012
        var dateRep = new Date(Sunrise.YEAR, 0, 1);
        dateRep.setDate(dayOfYear); // will wrap

        var dateString = d3.time.format(Sunrise.DATE_FORMAT)(dateRep);

        var span = Sunrise.getSpan(dayOfYear + Sunrise.FIRST_DAY_OF_YEAR,
                                   instance.lat,
                                   instance.lng);

        instance.popOver.select('#date').text(dateString);


        // this date just represents solar noon on a random day, for time calculations
        var timeTemp = new Date(2012, 0, 1, 12, 0);
        var noon = timeTemp.getHours();

        var fromNoon = span / 2;

        // sunrise
        timeTemp.setHours(noon - Math.ceil(span / 2));
        // we're counting from the end of the hour here
        timeTemp.setMinutes(60 - (fromNoon - Math.floor(fromNoon)) * 60);

        var fmt = d3.time.format(Sunrise.TIME_FORMAT);
        instance.popOver.select('#rise').text(fmt(timeTemp));

        // sunset
        // don't divide by two, we're moving the timeTemp from sunrise to sunset
        timeTemp.setHours(noon + Math.floor(fromNoon));
        // we're counting from the start of the hour here
        timeTemp.setMinutes((fromNoon - Math.floor(fromNoon)) * 60);

        instance.popOver.select('#set').text(fmt(timeTemp));

        // put it on the right
        if (instance.width - x > 350)
            instance.popOver.attr('transform', 'translate(' + (x + 25) + ', ' + 
                                  (instance.height - 225) + ')');
        else
            // put it on the left
            instance.popOver.attr('transform', 'translate(' + (x - 325) + ', ' + 
                                  (instance.height - 225) + ')');

        instance.popOver.transition().attr('opacity', '.8');

        instance.currentDate
            .attr('opacity', 1)
            .attr('points', function(d) {
                return x + ',' + instance.yScale(span / 2) + ' ' +
                    x + ',' + instance.yScale(-1 * span / 2);
            });
        
    });

    this.path.on('mouseout', function () {
        instance.hideCurrentDate();
    });
    
    this.drawEnvelope();
};


// static config variables
Sunrise.DATE_FORMAT = '%B %d';
Sunrise.TIME_FORMAT = '%I:%M %p';
// constants
Sunrise.YEAR = 2012;
Sunrise.FIRST_DAY_OF_YEAR = 2455928;

Sunrise.prototype.hideCurrentDate = function () {
    this.currentDate.transition().attr('opacity', 0);
    this.popOver.transition().attr('opacity', 0);
};

Sunrise.prototype.drawEnvelope = function () {
    console.log('drawing envelope');
    var envelope = Sunrise.getEnvelope(this.lat, this.lng, this.year);

    // hide this so it's not the wrong length
    this.hideCurrentDate();

    this.path
        //.transition()
        .attr('d', this.area(envelope));
};

// STATIC FUNCTIONS BELOW HERE
/**
 * convert degrees to radians
 * @param {Number} degrees
 */
Sunrise.degToRad = function (degrees) {
    return (degrees * 2 * Math.PI) / 360;
};

/**
 * convert radians to degrees
 * @param {Number} radians
 */
Sunrise.radToDeg = function (radians) {
    return (radians * 360) / (2 * Math.PI);
};

// http://en.wikipedia.org/wiki/Sunrise_equation

/**
 * Calculate span of day length
 * @param {Number} jdate the Julain day
 * @param {Number} lat the latitude of the observer
 * @param {Number} lng the longitude _east of Greenwich_ of the observer
 */
Sunrise.getSpan = function (jdate, lat, lng) {

    var l_w = -1 * lng;
    var nstar = jdate - 2451545.0009 - l_w / 360;
    // note: originally half-bracketed
    var n = nstar + 1/2;

    // Solar noon
    var jstar = 2451545.0009 + l_w / 360 + n;

    // solar mean anomaly
    var M = (357.5291 + 0.98560028 * (jstar - 2451545)) % 360;

    // equation of center
    var C = 1.9148 * Math.sin(Sunrise.degToRad(M)) + 
        0.0200 * Math.sin(Sunrise.degToRad(2*M)) +
        0.0003 * Math.sin(Sunrise.degToRad(3*M));

    // Ecliptic Longitude
    var gamma = (M + 102.9372 + C + 180) % 360;

    // Solar Transit
    var J_transit = jstar + 0.0053 * Math.sin(Sunrise.degToRad(M)) -
        0.0069 * Math.sin(Sunrise.degToRad(2 * gamma))
;
    // Declination of the Sun
    var sindelta = Math.sin(Sunrise.degToRad(gamma)) * 
        Math.sin(Sunrise.degToRad(23.45));

    // hour angle
    // TODO: observer elevation
    var omega_0 = 
        Sunrise.radToDeg(
            Math.acos(
                (Math.sin(Sunrise.degToRad(-0.83)) - 
                 (Math.sin(Sunrise.degToRad(lat)) * sindelta)) /
                    (Math.cos(Sunrise.degToRad(lat)) *
                     Math.cos(Math.asin(sindelta)))
            )
        );
            
    var J_set = 2451545.0009 + (omega_0 + l_w) / 360 + n +
        0.0053 * Math.sin(Sunrise.degToRad(M)) -
        0.0069 * Math.sin(Sunrise.degToRad(2 * gamma));

    // the day length, in hours
    // *2 is for span not distance from noon, *24 is for hours
    var span = (J_set - J_transit) * 2 * 24;
    return span;
};

Sunrise.getEnvelope = function (lat, lng) {
    var envelope = [];

    for (var i = 0; i < 366; i++) {
        envelope.push(Sunrise.getSpan(i + Sunrise.FIRST_DAY_OF_YEAR, lat, lng));
    }

    return envelope;
};

s = new Sunrise('viz', 0, 0);

d3.selectAll('#lat').on('change', function () {
    var humanReadable;
    if (this.value == 0)
	humanReadable = '0&deg;'
    else if (this.value > 0)
	humanReadable = this.value + '&deg; N';
    else
	humanReadable = (-1 * this.value) + '&deg; S';

    d3.select('#latReadout').html(humanReadable);
    s.lat = this.value; 
    s.drawEnvelope(); 
});

/*
d3.selectAll('#lng').on('focusout', function () {
    s.lng = this.value; 
    s.drawEnvelope(); 
});
*/
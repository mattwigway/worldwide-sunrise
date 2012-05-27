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
        .domain([0, 364])
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

    // labels
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
                   'Sep', 'Oct', 'Nov', 'Dec'];
    var monthsScale = d3.scale.linear()
        .domain([0, 12]) // array indices
        .range([0, this.width]);

    var labelEnter = this.svg.append('g')
        .attr('transform', 'translate(0, ' + this.height + ')')
        .selectAll('g')
        .data(months)
        .enter().append('g');

    
    labelEnter.append('text')
        .text(String)
        .attr('transform', function (d, i) {
            return 'translate(' + monthsScale(i) + ', 0)';
        });

    labelEnter.append('polyline')
        .attr('stroke', '#bbbbbb')
	.attr('shape-rendering', 'crispEdges')
        .attr('points', function (d, i) {
            var x = monthsScale(i);
            var span = instance.height / 32;
            return x + ',' + span + ' ' + x + ',-' + span;
        });

    this.drawEnvelope();
};

Sunrise.prototype.drawEnvelope = function () {
    var envelope = Sunrise.getEnvelope(this.lat, this.lng, this.year);

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

    for (var i = 0; i < 365; i++) {
	// Julian day for Jan 1, 2012
        envelope.push(Sunrise.getSpan(i + 2455928, lat, lng));
    }

    return envelope;
};

s = new Sunrise('viz', 37, 0);

d3.selectAll('#lat').on('change', function () {
    d3.select('#latReadout').html(this.value + '&deg;');
    s.lat = this.value; 
    s.drawEnvelope(); 
});

/*
d3.selectAll('#lng').on('focusout', function () {
    s.lng = this.value; 
    s.drawEnvelope(); 
});
*/
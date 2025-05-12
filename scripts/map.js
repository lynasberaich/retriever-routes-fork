import { buildings, food, parking, resources, shorthandInputs, buildingNames, permit_names } from './data.js';
import { umbc_polygons } from './polygons.js';

// Define the geographical bounds for UMBC's campus - slightly expanded
var umbcBounds = [
    [39.2480, -76.7180], // Southwest corner (expanded)
    [39.2620, -76.7020]  // Northeast corner (expanded)
];

// initialize the map centered on UMBC
var map = L.map('map', {
    maxBounds: umbcBounds, // Set the max bounds
    maxBoundsViscosity: 1.0, // Ensures the map bounces back when dragged out of bounds
    minZoom: 15, // Prevent zooming out too far
    maxZoom: 22, // Maximum zoom level
    zoomSnap: 0.5, // Allow half-step zoom levels
    bounceAtZoomLimits: true // Bounce effect when trying to zoom beyond limits
}).setView([39.2557, -76.7110], 16.5); // Zoom level adjusted for campus view

var selectedParkStart = "";
var selectedParkEnd = "";

var sel_destination_flag = 0;
var sel_start_flag = 0;

let activeMarkers = [];

// Add this near the beginning of your document ready function
let currentTravelMode = 'pedestrian'; // Default to walking

// Add these variables at the top of your file near other global variables
let userLocationMarker = null;
let locationWatchId = null;
let isTrackingLocation = false;

// add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 22
}).addTo(map);

const pawPrintIcon = L.icon({
    iconUrl: 'assets/pawprint.png', // Replace with the actual path to your pawprint image
    iconSize: [32, 32], // Size of the icon
    iconAnchor: [16, 16], // Anchor point of the icon
    popupAnchor: [0, -16] // Offset the popup
});


// Add invisible clickable building areas
function addClickableBuildings() {
    // Define building information with polygon coordinates and details

    // Create invisible polygons for each building
    for (const [key, building] of Object.entries(umbc_polygons)) {
        if (!(key in buildings)) {
            console.warn(`Key "${key}" missing in buildings`);
        }
        // Create invisible polygon
        const correctedCoords = building.map(coord => [coord[1], coord[0]]);

        const polygon = L.polygon(correctedCoords, {
            color: 'transparent',       // Invisible border
            fillColor: 'transparent',   // Invisible fill
            fillOpacity: 0,             // Completely transparent
            weight: 0                   // No border
        }).addTo(map);
        
        // Change cursor to pointer when hovering over building
        polygon.on('mouseover', function() {
            this.setStyle({
                fillOpacity: 0.5,       // Slight highlight on hover
                //fillColor: '#FDB515'    // UMBC gold
                fillColor: '#007176' // UMBC AOK Teal
            });
            document.getElementById('map').style.cursor = 'pointer';
        });
        
        // Remove highlight when mouse leaves
        polygon.on('mouseout', function() {
            this.setStyle({
                fillOpacity: 0,
                fillColor: 'transparent'
            });
            document.getElementById('map').style.cursor = '';
        });
        
        // Create popup content with HTML formatting
        if ("info" in buildings[key]){
            const popupContent = `
                <div class="building-popup">
                    <h3>${buildings[key].info.name}</h3>
                    <p>${buildings[key].info.description}</p>
                    <p><strong>Hours:</strong><br>${buildings[key].info.hours}</p>
                    <p><strong>Facilities:</strong></p>
                    <ul>
                        ${buildings[key].info.facilities.map(facility => `<li>${facility}</li>`).join('')}
                    </ul>
                </div>
            `;
            
            
            // Bind popup to polygon
            polygon.bindPopup(popupContent, {
                maxWidth: 300,
                className: 'building-info-popup'
            });
        }
    }
}

// Call the function to add clickable buildings
addClickableBuildings();


//function to handle search
document.getElementById('search-place').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent form submission from reloading page

    let searchQuery = document.getElementById('search-input').value.trim().toLowerCase();

    console.log(searchQuery);
        
    if (shorthandInputs[searchQuery]) {
        buildingName = shorthandInputs[searchQuery];
        map.flyTo(buildings[buildingName].coordinates, 19); // Zoom in and move to location

        // Create popup content with HTML formatting
        if ("info" in buildings[buildingName]){
            const popupContent = `
                <div class="building-popup">
                    <h3>${buildings[buildingName].info.name}</h3>
                    <p>${buildings[buildingName].info.description}</p>
                    <p><strong>Hours:</strong><br>${buildings[buildingName].info.hours}</p>
                    <p><strong>Facilities:</strong></p>
                    <ul>
                        ${buildings[buildingName].info.facilities.map(facility => `<li>${facility}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
    } else {
        alert("Location not found!");
    }
});

// Add autocomplete functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const autocompleteContainer = document.createElement('div');
    autocompleteContainer.className = 'autocomplete-items';
    searchInput.parentNode.appendChild(autocompleteContainer);
    
    // Get all location keys for autocomplete
    const locationKeys = Object.keys(shorthandInputs);
    
    // Show suggestions as user types
    searchInput.addEventListener('input', function() {
        
        const value = this.value.toLowerCase().trim();
        
        // Clear previous suggestions
        autocompleteContainer.innerHTML = '';
        
        if (!value) return false;
        
        // Filter matching locations
        const matches = locationKeys.filter(key => 
            key.toLowerCase().includes(value)
        );
        
        // Show only top 5 matches to avoid overwhelming the UI
        matches.slice(0, 5).forEach(match => {
            console.log(match);
            const item = document.createElement('div');
            item.innerHTML = shorthandInputs[match];
            item.addEventListener('click', function() {
                searchInput.value = match;
                autocompleteContainer.innerHTML = '';
                // Move map to selected location
                map.flyTo(buildings[shorthandInputs[match]].coordinates, 19);
            });
            autocompleteContainer.appendChild(item);
        });
    });
    
    // Hide suggestions when clicking elsewhere
    document.addEventListener('click', function(e) {
        if (e.target !== searchInput) {
            autocompleteContainer.innerHTML = '';
        }
    });
});

document.addEventListener("DOMContentLoaded", function() {
    // Select all dropdowns
    const dropdowns = document.querySelectorAll('.dropdown');

    // Add click event to each dropdown
    dropdowns.forEach(dropdown => {
        dropdown.querySelector('button').addEventListener('click', function() {
            // Toggle the active class to show/hide the dropdown content
            dropdown.classList.toggle('active');
        });
    });
});

// ------------- Filtering --------------

function updateMarkers() {
    // Clear old markers
    activeMarkers.forEach(m => map.removeLayer(m));
    activeMarkers = [];

    const checkedPermits = Array.from(document.querySelectorAll('#permit-filters input:checked'))
        .map(cb => cb.value);

    for (const lot of Object.values(parking)) {
        const matchingPermits = lot.permit.filter(p => checkedPermits.includes(p));

        matchingPermits.forEach((permit, index) => {
            const icon = L.divIcon({
                className: '',
                html: `<div class="permit-marker" style="background-color: ${getColor(permit)};">${permit}</div>`,
                iconSize: [25, 25],
                iconAnchor: [12, 12]
            });
            
            const offset = getOffset(index); // use index to space out markers
            const offsetCoords = [
                lot.coordinates[0] + offset[0],
                lot.coordinates[1] + offset[1]
            ];

            const all_permit_names = [];
            for (let i = 0; i < lot.permit.length; i++) {
                all_permit_names.push(permit_names[lot.permit[i]]);
            }
            all_permit_names.join(", ");

            const popupContent = `
                <div class="parking-popup">
                    <h3>${lot.name}</h3>
                    <p><strong>Permits permitted:</strong><br>${all_permit_names}</p>
                    <p><strong>Hours enforced:</strong><br>${lot.hours}</p>
                    <button class="set-start-btn" data-lat="${offsetCoords[0]}" data-lng="${offsetCoords[1]}"><strong>Set as Start Location</strong></button><br>
                    <button class="set-destination-btn" data-lat="${offsetCoords[0]}" data-lng="${offsetCoords[1]}"><strong>Set as Destination</strong></button>
                </div>
            `;

            

            const marker = L.marker(offsetCoords, { icon })
                .bindPopup(popupContent, {
                    maxWidth: 300,
                    className: 'parking-info-popup'});
            
                    marker.on('popupopen', function() {
                        const destinationBtn = document.querySelector('.set-destination-btn');
                        const startBtn = document.querySelector('.set-start-btn');
                    
                        if (destinationBtn) {
                            destinationBtn.addEventListener('click', function () {
                                const lat = parseFloat(this.getAttribute('data-lat'));
                                const lng = parseFloat(this.getAttribute('data-lng'));
                    
                                document.getElementById('route-end').value = lot.name;
                    
                                selectedParkEnd = lot;
                                sel_destination_flag = 1;
                                marker.closePopup();
                            });
                        }
                    
                        if (startBtn) {
                            startBtn.addEventListener('click', function () {
                                const lat = parseFloat(this.getAttribute('data-lat'));
                                const lng = parseFloat(this.getAttribute('data-lng'));
                    
                                document.getElementById('route-start').value = lot.name;
                                selectedParkStart = lot;
                                sel_start_flag = 1;
                    
                                marker.closePopup();
                            });
                        }
                    });                    
            marker.addTo(map);
            activeMarkers.push(marker);
        });

    
    }
}

function getOffset(index) {
    const delta = 0.00007; // Small nudge in degrees
    const offsets = [
        [delta, delta],
        [-delta, delta],
        [delta, -delta],
        [-delta, -delta],
        [0, delta],
        [delta, 0],
        [0, -delta],
        [-delta, 0]
    ];
    return offsets[index % offsets.length]; // Cycle if more than 8
}

function getColor(permit) {
    const colors = {
        A: '#d9534f',
        B: '#047d00',
        C: '#ffc800',
        D: '#7300b5',
        E: '#7300b5',
        P: '#292b2c',
        Ev: '#008da6',
        '♿': '#0099ff'
    };
    return colors[permit] || '#666';
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('#permit-filters input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        console.log(`Checked: ${cb.value}`);
        updateMarkers(); // This function should handle adding/removing markers
      });
    });
});


//#region ROUTING
// Custom Google router
L.Routing.Google = L.Class.extend({
    initialize: function(options) {
        this.options = {
            travelMode: 'WALKING',
            unitSystem: google.maps.UnitSystem.IMPERIAL,
            ...options
        };
    },

    // The main routing function called by L.Routing.control
    route: function(waypoints, callback, context, options) {
        var _this = this; // Keep reference to 'this' for the callback
        // Combine default router options, per-route options from control, if any
        var routeOpts = L.Util.extend({}, this.options, options);

        // Check if Google Maps API is ready
        if (typeof google === 'undefined' || !google.maps || !google.maps.DirectionsService) {
            return callback.call(context, {
                status: -1, // Use a custom error status
                message: "Google Maps API not loaded or ready."
            });
        }

        var directionsService = new google.maps.DirectionsService();

        // Extract L.LatLng objects from LRM waypoints
        var originLatLng = waypoints[0].latLng;
        var destinationLatLng = waypoints[waypoints.length - 1].latLng;

        // Build the Google Directions Request object
        var request = {
            origin: { lat: originLatLng.lat, lng: originLatLng.lng },
            destination: { lat: destinationLatLng.lat, lng: destinationLatLng.lng },
            travelMode: routeOpts.travelMode,
            unitSystem: routeOpts.unitSystem
            // Add more options from routeOpts if needed (e.g., provideRouteAlternatives)
        };

        // Handle intermediate waypoints if present (optional, more complex)
        if (waypoints.length > 2) {
            request.waypoints = waypoints.slice(1, -1).map(function(wp) {
                return { location: { lat: wp.latLng.lat, lng: wp.latLng.lng }, stopover: true };
            });
            // request.optimizeWaypoints = true; // Optional
        }

        // Perform the routing request
        directionsService.route(request, function(response, status) {
            if (status === google.maps.DirectionsStatus.OK) {
                try {
                    // Convert the Google response to the format LRM expects
                    const lrmRoutes = [_this._convertRoute(response)]; // LRM expects an array of route objects
                    // Call LRM's callback with error=null, routes=array
                    callback.call(context, null, lrmRoutes);
                } catch (e) {
                     console.error("Error converting Google route:", e);
                     callback.call(context, { status: -2, message: "Error processing Google Directions response: " + e.message });
                }
            } else {
                // Pass the Google error status/message back to LRM's callback
                console.error("Google Directions request failed:", status);
                callback.call(context, { status: status, message: "Google Directions request failed: " + status });
            }
        });

        return this; // LRM expects the router instance to be returned
    },

    // Private helper method to convert Google route format to LRM format
    _convertRoute: function(googleRouteResponse) {
        const route = googleRouteResponse.routes[0];
        const leg = route.legs[0]; // Assuming only one leg
        const coordinates = [];
        const instructions = [];
        let currentCoordIndex = 0; // Index for matching geometry points to instructions
        const totalSteps = leg.steps.length;
    
        // Process each step from Google Directions
        leg.steps.forEach((step, i) => {
            // Decoding the geometry for this step
            const path = google.maps.geometry.encoding.decodePath(step.polyline.points);
            const stepCoords = path.map(function(latLng) {
                return L.latLng(latLng.lat(), latLng.lng());
            });
    
            // Add coordinates to the main array, avoiding duplicates at step boundaries
            if (coordinates.length > 0 && stepCoords.length > 0) {
                if (coordinates[coordinates.length - 1].equals(stepCoords[0])) {
                    stepCoords.splice(0, 1); // Remove duplicate start point
                }
            }

            coordinates.push(...stepCoords);

            // Determine LRM Type and Modifier based on Index and Google Maneuver
        let lrmType = 'Continue';
        let lrmModifier = 'Straight';

        if (i === 0) {
            // first step (Depart)
            lrmType = 'Head';       // This maps to 'depart' icon in getIconName(instr, 0)
            lrmModifier = '';       // Modifier not relevant for depart

        } else if (i === totalSteps - 1) {
            // last step (Arrive)
            lrmType = 'DestinationReached'; // This maps to 'arrive' icon in getIconName
            lrmModifier = '';

        } else {
            // intermediate steps
            const maneuver = (step.maneuver || '').toLowerCase();

            switch (maneuver) {
                // LRM Icon: bear-left (via SlightLeft modifier)
                case 'turn-slight-left':
                    lrmType = 'Left'; lrmModifier = 'SlightLeft'; break;

                // LRM Icon: sharp-left
                case 'turn-sharp-left':
                    lrmType = 'Left'; lrmModifier = 'SharpLeft'; break;

                // LRM Icon: turn-left
                case 'turn-left':
                    lrmType = 'Left'; lrmModifier = 'Left'; break;

                // LRM Icon: bear-right (via SlightRight modifier)
                case 'turn-slight-right':
                    lrmType = 'Right'; lrmModifier = 'SlightRight'; break;

                // LRM Icon: sharp-right
                case 'turn-sharp-right':
                    lrmType = 'Right'; lrmModifier = 'SharpRight'; break;

                // LRM Icon: turn-right
                case 'turn-right':
                    lrmType = 'Right'; lrmModifier = 'Right'; break;

                // LRM Icon: u-turn
                case 'uturn-left':
                case 'uturn-right': // Map both to LRM's Uturn modifier
                    // Check getIconName: Does it use Type or Modifier for Uturn? Let's set both if unsure.
                    lrmType = 'Uturn'; lrmModifier = 'Uturn'; break;

                // LRM Icon: continue (via Straight modifier)
                case 'straight':
                    lrmType = 'Continue'; lrmModifier = 'Straight'; break;

                // LRM Icon: enter-roundabout
                case 'roundabout-left':
                case 'roundabout-right':
                     lrmType = 'Roundabout';
                     lrmModifier = '';
                     break;

                default:
                    lrmType = 'Continue'; lrmModifier = 'Straight';
                    break;
            }
        }
    
            // Create the instruction object for LRM, adding index information
            instructions.push({
                text: step.instructions,
                distance: step.distance.value, 
                time: step.duration.value,     
                index: currentCoordIndex,     
    
                // this is for icon logic
                instructionIndex: i,
                totalInstructions: totalSteps,
                type: lrmType,
                modifier: lrmModifier
            });
    
            // Update the geometry index for the start of the next step
            currentCoordIndex = coordinates.length;
        });
    
        // Construct the route object structure that LRM expects
        return {
            name: route.summary || '', // Use Google's summary (e.g., road names) if available
            summary: {
                totalDistance: leg.distance.value,
                totalTime: leg.duration.value     
            },
            coordinates: coordinates,
            instructions: instructions,
            waypoints: [],
            inputWaypoints: []
        };
    }
});

/* we need a custom formatter because default LRM formatter doesn't handle
    Google's html tags well */
L.Routing.HtmlFormatter = L.Routing.Formatter.extend({
    options: {
        ...L.Routing.Formatter.prototype.options,
    },

    // Store the last instruction object and its LRM index
    _lastInstruction: null,
    _lastInstructionIndex: -1, // LRM's internal index passed to formatInstruction

    formatInstruction: function(instruction, i) {
        this._lastInstruction = instruction;
        this._lastInstructionIndex = i;
        return instruction.text;
    },

    // Getter for the builder
    getIconNameForLastInstruction: function() {
        // Call the actual LRM logic using the stored instruction and index
        // Pass null checks just in case
        return this.getIconName(this._lastInstruction || {}, this._lastInstructionIndex);
    },

    // Exact LRM getIconName logic you provided
    getIconName: function(instr, i) {
        // Check Type first for special cases
        switch (instr.type) {
        case 'Head':
            if (i === 0) {
                return 'depart'; // Only 'depart' if it's the first instruction
            }
            break; // Fall through to check modifier if not index 0
        case 'WaypointReached':
            return 'via';
        case 'Roundabout':
            return 'enter-roundabout';
        case 'DestinationReached':
            return 'arrive';
        } // If type didn't match special cases, check modifier

        // Check Modifier for turn specifics
        switch (instr.modifier) {
        case 'Straight':
            return 'continue';
        case 'SlightRight':
            return 'bear-right'; // Maps SlightRight modifier to bear-right icon
        case 'Right':
            return 'turn-right';
        case 'SharpRight':
            return 'sharp-right';
        case 'TurnAround':
        case 'Uturn': // Handle both cases if needed
            return 'u-turn';
        case 'SharpLeft':
            return 'sharp-left';
        case 'Left':
            return 'turn-left';
        case 'SlightLeft':
            return 'bear-left'; // Maps SlightLeft modifier to bear-left icon
        }

        // Default if nothing else matched (e.g., 'Head' on non-first step)
        return 'continue';
    }
});

// Custom itinerary builder to handle proper formatting
L.Routing.CustomItineraryBuilder = L.Routing.ItineraryBuilder.extend({

    // to store the steps container <tbody> reference
    _stepsContainer: null,
    formatter: null,

    initialize: function(options) {
        L.Routing.ItineraryBuilder.prototype.initialize.call(this, options);
        this.formatter = this.options.formatter;
        if (!this.formatter) { console.error("No formatter was passed into the builder"); this.formatter = new L.Routing.Formatter();}
    },

    // override createStepsContainer to store the reference
    createStepsContainer: function() {
        // call parent implementation first to get the actual steps container
        var container = L.Routing.ItineraryBuilder.prototype.createStepsContainer.call(this);
        this._stepsContainer = container; // store it
        return container;
    },

    // override createStep to perform custom DOM creation and use innerHTML
    createStep: function(text, distance, stepsContainer_param_ignored) {
        // retrieve the stored container reference (the <tbody>)
        var actualStepsContainer = this._stepsContainer;
        if (!actualStepsContainer) {
            console.error("Invalid stored _stepsContainer! Cannot create or append step.");
            return null;
        }

         // Get index and total steps from the formatter
         let index = -1;
         let total = -1;
         if (this.formatter && typeof this.formatter.getLastInstructionIndex === 'function') {
             index = this.formatter.getLastInstructionIndex();
             total = this.formatter.getTotalSteps();
         }

        try {
            // create the row element <tr>, don't append to actualStepsContainer yet
            var step = L.DomUtil.create('tr', '');

            // create cells
            var iconCell = L.DomUtil.create('td', 'leaflet-routing-icon', step);
            var instructionCell = L.DomUtil.create('td', 'leaflet-routing-instruction-text', step);
            var distanceCell = L.DomUtil.create('td', 'leaflet-routing-instruction-distance', step);

             // icon logic
             let iconName = 'continue'; // Default
             if (this.formatter && typeof this.formatter.getIconNameForLastInstruction === 'function') {
                 // Get icon name using the full logic now inside the formatter
                 iconName = this.formatter.getIconNameForLastInstruction();
             } else {
                  console.warn("Formatter or getIconNameForLastInstruction unavailable.");
             }
 
             // Add the specific class suffix determined by getIconName
             if (iconName) {
                 L.DomUtil.addClass(iconCell, 'leaflet-routing-icon-' + iconName);
             }

            instructionCell.innerHTML = text;
            distanceCell.textContent = distance;

            // append the created step <tr> to the stored container <tbody>
            actualStepsContainer.appendChild(step);

            // return the element
            return step;

        } catch (e) {
            console.error("Error during custom createStep execution:", e);
            return null;
        }
    }
});

var customFormatter = new L.Routing.HtmlFormatter ({units: 'imperial'});
var customItineraryBuilder = new L.Routing.CustomItineraryBuilder({formatter: customFormatter});
// we'll want the user to be able to choose their travel mode
let travel = 'WALKING'; // Can be 'DRIVING', 'WALKING', 'BICYCLING', 'TRANSIT'
// Routing Control
const routeCtrl = L.Routing.control({
    waypoints: [
      L.latLng(buildings["Administration Building"].coordinates),
      L.latLng(buildings["Retriever Soccer Park Ticket Booth"].coordinates)
    ],
    /*/ OSRM routing service
    router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1'
    }), */
    // Google Router
    router: new L.Routing.Google({
        travelMode: travel,
        unitSystem: google.maps.UnitSystem.IMPERIAL
    }),
 //UI_pawprints
    lineOptions: {
        styles: [{
            color: 'transparent',  // Change to a visible color
            opacity: 1,     // Make it visible
            weight: 1       // Increase weight to make it thicker
        }]
    },    

    formatter: customFormatter,
    itineraryBuilder: customItineraryBuilder,

    routeWhileDragging: true,
    position: 'bottomleft',
    fitSelectedRoutes: true,
    addWaypoints: false,
    collapsible: true,
  }).addTo(map);

  routeCtrl.on('routeselected', function(event) {
    const routeCoordinates = event.route.coordinates;

    // Clear previous paw prints
    activeMarkers.forEach(marker => map.removeLayer(marker));
    activeMarkers = [];

    const intervalDistance = 25; // in meters (change to make closer/farther)
    let accumulatedDistance = 0;
    let lastPrintCoord = routeCoordinates[0];

    for (let i = 1; i < routeCoordinates.length; i++) {
        const currentCoord = routeCoordinates[i];
        const segmentDistance = lastPrintCoord.distanceTo(currentCoord);

        accumulatedDistance += segmentDistance;

        while (accumulatedDistance >= intervalDistance) {
            // Calculate how far along the segment to place the paw print
            const overshoot = accumulatedDistance - intervalDistance;
            const fraction = 1 - (overshoot / segmentDistance);

            const lat = lastPrintCoord.lat + fraction * (currentCoord.lat - lastPrintCoord.lat);
            const lng = lastPrintCoord.lng + fraction * (currentCoord.lng - lastPrintCoord.lng);

            const pawPrintMarker = L.marker([lat, lng], { icon: pawPrintIcon }).addTo(map);
            activeMarkers.push(pawPrintMarker);

            // Prepare for next interval
            accumulatedDistance -= intervalDistance;
            lastPrintCoord = L.latLng(lat, lng);
        }

        lastPrintCoord = currentCoord;
    }
});

// Autocomplete for routing inputs
document.addEventListener('DOMContentLoaded', function() {
    const startInput = document.getElementById('route-start');
    const endInput = document.getElementById('route-end');
    
    const startAutocomplete = document.createElement('div');
    const endAutocomplete = document.createElement('div');
    startAutocomplete.className = 'autocomplete-items';
    endAutocomplete.className = 'autocomplete-items';
    startInput.parentNode.appendChild(startAutocomplete);
    endInput.parentNode.appendChild(endAutocomplete);

    // Handling autocomplete
    function setupAutocomplete(input, autocompleteContainer) {
        input.addEventListener('input', function() {
            const value = this.value.toLowerCase().trim();
            
            // Clear previous suggestions
            autocompleteContainer.innerHTML = '';
            
            if (!value) return false;
            
            // Filter matching locations
            const matches = Object.keys(shorthandInputs).filter(key => 
                key.toLowerCase().includes(value)
            );
            
            // Show top 5 matches
            matches.slice(0, 5).forEach(match => {
                const item = document.createElement('div');
                item.innerHTML = shorthandInputs[match];
                item.addEventListener('click', function() {
                    input.value = shorthandInputs[match];
                    autocompleteContainer.innerHTML = '';
                });
                autocompleteContainer.appendChild(item);
            });
        });
    }

    // Setup autocomplete for both inputs
    setupAutocomplete(startInput, startAutocomplete);
    setupAutocomplete(endInput, endAutocomplete);

    // Handling the routing form submission and toggle functionality
    document.getElementById('routing-search').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const startLocation = startInput.value.trim().toLowerCase();
        const endLocation = endInput.value.trim().toLowerCase();
        
        // Check for "My Location" case first
        if (startLocation === "my location" && startInput.dataset.lat && startInput.dataset.lng) {
            const userLat = parseFloat(startInput.dataset.lat);
            const userLng = parseFloat(startInput.dataset.lng);
            
            if (endLocation in shorthandInputs) {
                const endBuilding = shorthandInputs[endLocation];
                
                // Update the route
                routeCtrl.setWaypoints([
                    L.latLng(userLat, userLng),
                    L.latLng(buildings[endBuilding].coordinates)
                ]);
                
                // Hide the search container and show the toggle button
                document.getElementById('routing-search-container').classList.add('hidden');
                document.getElementById('toggle-search-btn').classList.remove('hidden');
                
                return; // Important: exit early to avoid showing the error alert
            }
        }
        
        // Continue with the other conditions
        if (shorthandInputs[startLocation] && shorthandInputs[endLocation]) {
            // Update routing control waypoints
            routeCtrl.setWaypoints([
                L.latLng(buildings[shorthandInputs[startLocation]].coordinates),
                L.latLng(buildings[shorthandInputs[endLocation]].coordinates)
            ]);
            
            // Hide the search container and show the toggle button
            document.getElementById('routing-search-container').classList.add('hidden');
            document.getElementById('toggle-search-btn').classList.remove('hidden');
        } 
        else if (sel_destination_flag && !sel_start_flag) {
            // Handle existing logic
            routeCtrl.setWaypoints([
                L.latLng(buildings[shorthandInputs[startLocation]].coordinates),
                L.latLng(selectedParkEnd.coordinates)
            ]);
            sel_destination_flag = 0;
            document.getElementById('route-end').value = "";
            
            // Hide the search container and show the toggle button
            document.getElementById('routing-search-container').classList.add('hidden');
            document.getElementById('toggle-search-btn').classList.remove('hidden');
        }
        // Handle other conditions...
        else {
            alert("Invalid waypoint(s)");
        }
    });

    // Toggle search container visibility when the button is clicked
    document.getElementById('toggle-search-btn').addEventListener('click', function() {
        document.getElementById('routing-search-container').classList.remove('hidden');
        this.classList.add('hidden');
    });

    // Hide suggestions when clicking elsewhere
    document.addEventListener('click', function(e) {
        if (e.target !== startInput && e.target !== endInput) {
            startAutocomplete.innerHTML = '';
            endAutocomplete.innerHTML = '';
        }
    });
});


const routingContainer = document.querySelector('.leaflet-routing-container');
const routingSearchContainer = document.getElementById('routing-search-container');

// Store the last used waypoints so we can restore them
let lastWaypoints = [];

// Observer to watch for class changes on the routing container
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.attributeName === 'class') {
            // Check if routing container is collapsed
            const isCollapsed = routingContainer.classList.contains('leaflet-routing-container-hide');
            
            // Toggle search container visibility
            routingSearchContainer.classList.toggle('hidden', isCollapsed);
            
            // If collapsed, store current waypoints and clear the route
            if (isCollapsed) {
                // Store current waypoints before clearing
                lastWaypoints = routeCtrl.getWaypoints().map(wp => wp.latLng ? L.latLng(wp.latLng.lat, wp.latLng.lng) : null)
                    .filter(wp => wp !== null);
                
                // Clear the route by setting empty waypoints
                routeCtrl.setWaypoints([]);
                
                // Also clear paw print markers
                activeMarkers.forEach(marker => map.removeLayer(marker));
                activeMarkers = [];
            } 
            // If expanded and we have stored waypoints, restore the route
            else if (lastWaypoints.length >= 2) {
                routeCtrl.setWaypoints(lastWaypoints);
            }
        }
    });
});

// Start observing the routing container for class changes
observer.observe(routingContainer, {
    attributes: true
});

// Error handling
routeCtrl.on('routingerror', function(e) {
    console.log('Routing error:', e);
});
//#endregion

// Document ready function to ensure DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Toggle button functionality
    document.getElementById('toggle-btn').addEventListener('click', function() {
        var mainDiv = document.getElementById('main-div');
        
        if (mainDiv.style.display === 'none') {
            mainDiv.style.display = 'block'; // Show the main-div
        } else {
            mainDiv.style.display = 'none'; 
        }
    });

    // Color scheme toggle functionality
    document.getElementById('color-scheme-toggle').addEventListener('click', function() {
        document.body.classList.toggle('light-teal-mode');
    });
    
    // Font size controls
    document.querySelectorAll('.font-size-btn').forEach(button => {
        button.addEventListener('click', function() {
            // Remove all font size classes
            document.body.classList.remove('font-size-normal', 'font-size-medium', 'font-size-large');
            
            // Add the selected font size class
            const size = this.getAttribute('data-size');
            document.body.classList.add('font-size-' + size);
            
            // Update active button
            document.querySelectorAll('.font-size-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
        });
    });
    
    // Set default font size
    document.body.classList.add('font-size-normal');

    // Welcome screen functionality
    const welcomeScreen = document.getElementById('welcome-screen');
    const closeButton = document.getElementById('welcome-close-btn');
    
    // Always show the welcome screen
    welcomeScreen.style.display = 'flex';
    
    // Close welcome screen when button is clicked
    closeButton.addEventListener('click', function() {
        welcomeScreen.style.opacity = '0';
        setTimeout(function() {
            welcomeScreen.style.display = 'none';
        }, 500);
    });

    // Geolocation functionality
    const useMyLocationBtn = document.getElementById('use-my-location');
    const startInput = document.getElementById('route-start');

    useMyLocationBtn.addEventListener('click', function() {
        // Toggle location tracking
        if (isTrackingLocation) {
            // If already tracking, just update the start input
            const startInput = document.getElementById('route-start');
            startInput.value = "My Location";
            
            if (userLocationMarker) {
                const position = userLocationMarker.getLatLng();
                startInput.dataset.lat = position.lat;
                startInput.dataset.lng = position.lng;
            }
        } else {
            // If not tracking, start tracking
            startInput.value = "Getting your location...";
            useMyLocationBtn.classList.add('loading');
            
            // Start tracking
            startLocationTracking();
            
            // Set up a one-time position handler
            const positionHandler = function(position) {
                // When we get first position, update input
                startInput.value = "My Location";
                useMyLocationBtn.classList.remove('loading');
                
                // Store coordinates
                startInput.dataset.lat = position.coords.latitude;
                startInput.dataset.lng = position.coords.longitude;
                
                // Remove this event listener (only needed once)
                navigator.geolocation.clearWatch(locationWatchId);
                locationWatchId = navigator.geolocation.watchPosition(
                    function(pos) {
                        const lat = pos.coords.latitude;
                        const lng = pos.coords.longitude;
                        const accuracy = pos.coords.accuracy;
                        
                        // Update marker position
                        userLocationMarker.setLatLng([lat, lng]);
                        
                        // Update accuracy circle
                        if (userLocationMarker.accuracyCircle) {
                            userLocationMarker.accuracyCircle.setLatLng([lat, lng]).setRadius(accuracy);
                        } else {
                            userLocationMarker.accuracyCircle = L.circle([lat, lng], {
                                radius: accuracy,
                                color: '#4285F4',
                                fillColor: '#4285F433',
                                weight: 1
                            }).addTo(map);
                        }
                        
                        // Update input field
                        startInput.dataset.lat = lat;
                        startInput.dataset.lng = lng;
                        
                        // Update route if needed
                        updateRouteIfUsingMyLocation();
                    },
                    function(error) {
                        console.error('Error getting location:', error);
                        stopLocationTracking();
                        
                        switch(error.code) {
                            case error.PERMISSION_DENIED:
                                alert("Location tracking was denied. Please enable location services.");
                                break;
                            case error.POSITION_UNAVAILABLE:
                                alert("Location information is unavailable.");
                                break;
                            case error.TIMEOUT:
                                alert("The request to get your location timed out.");
                                break;
                            default:
                                alert("An unknown error occurred while tracking your location.");
                                break;
                        }
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                );
            };
            
            // Get initial position
            navigator.geolocation.getCurrentPosition(positionHandler, function(error) {
                console.error('Error getting initial position:', error);
                startInput.value = "Location unavailable";
                useMyLocationBtn.classList.remove('loading');
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        alert("Location access was denied. Please enable location services.");
                        break;
                    case error.POSITION_UNAVAILABLE:
                        alert("Location information is unavailable.");
                        break;
                    case error.TIMEOUT:
                        alert("The request to get your location timed out.");
                        break;
                    default:
                        alert("An unknown error occurred while getting your location.");
                        break;
                }
            }, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        }
    });

    // Helper function to get the closest point on campus
    function getClosestPointOnCampus(userLocation) {
        // If user is already on campus, return their location
        if (isPointWithinUMBC(userLocation)) {
            return userLocation;
        }
        
        // Otherwise, find the closest point on campus bounds
        const closestPoint = L.GeometryUtil.closestPoint(map, [
            L.latLng(umbcBounds[0]),
            L.latLng(umbcBounds[1])
        ], userLocation);
        
        return closestPoint;
    }

    // Helper function to check if a point is within UMBC bounds
    function isPointWithinUMBC(point) {
        return point.lat >= umbcBounds[0][0] && 
               point.lat <= umbcBounds[1][0] && 
               point.lng >= umbcBounds[0][1] && 
               point.lng <= umbcBounds[1][1];
    }

    // Modify the routing form submission to handle "My Location"
    document.getElementById('routing-search').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const startLocation = startInput.value.trim().toLowerCase();
        const endLocation = document.getElementById('route-end').value.trim().toLowerCase();
        
        // Handle "My Location" as start point
        if (startLocation === "my location" && startInput.dataset.lat && startInput.dataset.lng) {
            const userLat = parseFloat(startInput.dataset.lat);
            const userLng = parseFloat(startInput.dataset.lng);
            
            if (endLocation in shorthandInputs) {
                const endBuilding = shorthandInputs[endLocation];
                
                // Update the route
                routeCtrl.setWaypoints([
                    L.latLng(userLat, userLng),
                    L.latLng(buildings[endBuilding].coordinates)
                ]);
                
                // Ensure routing panel is visible
                if (routingContainer.classList.contains('leaflet-routing-container-hide')) {
                    // Find and click the control button to expand it
                    const controlButton = document.querySelector('.leaflet-routing-collapse-btn');
                    if (controlButton) controlButton.click();
                }
                
                return;
            }
        }
        
        // Otherwise, proceed with normal routing logic
        // ... [rest of your existing routing code]
    });

    // Detect if we're on mobile
    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    if (isMobile) {
        // Create mobile-friendly step-by-step instructions view
        function createMobileInstructionsView() {
            // Wait for the routing container to be added to the DOM
            const checkForRoutingContainer = setInterval(function() {
                const routingContainer = document.querySelector('.leaflet-routing-container');
                if (routingContainer) {
                    clearInterval(checkForRoutingContainer);
                    
                    // Create our custom mobile instructions container
                    const mobileInstructions = document.createElement('div');
                    mobileInstructions.className = 'mobile-routing-instructions';
                    
                    // Create the instruction step display
                    const stepDisplay = document.createElement('div');
                    stepDisplay.className = 'mobile-instruction-step';
                    
                    const stepIcon = document.createElement('div');
                    stepIcon.className = 'mobile-instruction-icon';
                    
                    const stepText = document.createElement('div');
                    stepText.className = 'mobile-instruction-text';
                    stepText.textContent = 'Select a route to begin navigation';
                    
                    const stepDistance = document.createElement('div');
                    stepDistance.className = 'mobile-instruction-distance';
                    
                    stepDisplay.appendChild(stepIcon);
                    stepDisplay.appendChild(stepText);
                    stepDisplay.appendChild(stepDistance);
                    
                    // Create navigation controls
                    const navControls = document.createElement('div');
                    navControls.className = 'mobile-instruction-nav';
                    
                    const prevBtn = document.createElement('button');
                    prevBtn.className = 'mobile-nav-btn';
                    prevBtn.innerHTML = '&larr; Prev';
                    prevBtn.addEventListener('click', showPreviousStep);
                    
                    const stepCounter = document.createElement('div');
                    stepCounter.className = 'mobile-step-counter';
                    stepCounter.textContent = '0/0';
                    
                    const nextBtn = document.createElement('button');
                    nextBtn.className = 'mobile-nav-btn';
                    nextBtn.innerHTML = 'Next &rarr;';
                    nextBtn.addEventListener('click', showNextStep);
                    
                    navControls.appendChild(prevBtn);
                    navControls.appendChild(stepCounter);
                    navControls.appendChild(nextBtn);
                    
                    // Add everything to the container
                    mobileInstructions.appendChild(stepDisplay);
                    mobileInstructions.appendChild(navControls);
                    
                    // Append to the routing container
                    routingContainer.appendChild(mobileInstructions);
                    
                    // Store references for later
                    window.mobileRoutingElements = {
                        container: mobileInstructions,
                        icon: stepIcon,
                        text: stepText,
                        distance: stepDistance,
                        counter: stepCounter,
                        prevBtn: prevBtn,
                        nextBtn: nextBtn,
                        currentStep: 0,
                        instructions: []
                    };
                }
            }, 100);
        }
        
        // Initialize mobile view
        createMobileInstructionsView();
        
        // Show the next instruction step
        function showNextStep() {
            const elements = window.mobileRoutingElements;
            if (!elements || elements.instructions.length === 0) return;
            
            if (elements.currentStep < elements.instructions.length - 1) {
                elements.currentStep++;
                updateStepDisplay();
            }
        }
        
        // Show the previous instruction step
        function showPreviousStep() {
            const elements = window.mobileRoutingElements;
            if (!elements || elements.instructions.length === 0) return;
            
            if (elements.currentStep > 0) {
                elements.currentStep--;
                updateStepDisplay();
            }
        }
        
        // Update the step display with current instruction
        function updateStepDisplay() {
            const elements = window.mobileRoutingElements;
            if (!elements || elements.instructions.length === 0) return;
            
            const instr = elements.instructions[elements.currentStep];
            
            // Update icon
            elements.icon.className = 'mobile-instruction-icon leaflet-routing-icon-' + 
                (instr.iconName || 'continue');
            
            // Update text
            elements.text.innerHTML = instr.text;
            
            // Update distance
            if (instr.distance) {
                elements.distance.textContent = instr.distance;
                elements.distance.style.display = 'block';
            } else {
                elements.distance.style.display = 'none';
            }
            
            // Update counter
            elements.counter.textContent = `${elements.currentStep + 1}/${elements.instructions.length}`;
            
            // Enable/disable buttons as needed
            elements.prevBtn.disabled = elements.currentStep === 0;
            elements.nextBtn.disabled = elements.currentStep === elements.instructions.length - 1;
        }
        
        // Override the route selected event to populate our mobile instructions
        routeCtrl.on('routeselected', function(e) {
            // The default route handling (for desktop) happens here
            const routeCoordinates = e.route.coordinates;
            
            // Clear previous paw prints
            activeMarkers.forEach(marker => map.removeLayer(marker));
            activeMarkers = [];
            
            const intervalDistance = 25; // in meters (change to make closer/farther)
            let accumulatedDistance = 0;
            let lastPrintCoord = routeCoordinates[0];
            
            for (let i = 1; i < routeCoordinates.length; i++) {
                const currentCoord = routeCoordinates[i];
                const segmentDistance = lastPrintCoord.distanceTo(currentCoord);
                
                accumulatedDistance += segmentDistance;
                
                while (accumulatedDistance >= intervalDistance) {
                    // Calculate how far along the segment to place the paw print
                    const overshoot = accumulatedDistance - intervalDistance;
                    const fraction = 1 - (overshoot / segmentDistance);
                    
                    const lat = lastPrintCoord.lat + fraction * (currentCoord.lat - lastPrintCoord.lat);
                    const lng = lastPrintCoord.lng + fraction * (currentCoord.lng - lastPrintCoord.lng);
                    
                    const pawPrintMarker = L.marker([lat, lng], { icon: pawPrintIcon }).addTo(map);
                    activeMarkers.push(pawPrintMarker);
                    
                    // Prepare for next interval
                    accumulatedDistance -= intervalDistance;
                    lastPrintCoord = L.latLng(lat, lng);
                }
                
                lastPrintCoord = currentCoord;
            }
            
            // Mobile specific code to capture instructions
            if (isMobile && window.mobileRoutingElements) {
                // Process the instructions for mobile view
                const mobileInstructions = e.route.instructions.map((instr, idx) => {
                    // Determine the icon name to use
                    let iconName = customFormatter.getIconName(instr, idx);
                    
                    return {
                        text: instr.text,
                        distance: instr.distance ? customFormatter.formatDistance(instr.distance) : '',
                        iconName: iconName
                    };
                });
                
                // Store and display instructions
                window.mobileRoutingElements.instructions = mobileInstructions;
                window.mobileRoutingElements.currentStep = 0;
                updateStepDisplay();
            }
        });
    }

    // Add this after your existing code that initializes the dropdowns
    
    // Populate the building list dropdown
    const buildingListDropdown = document.getElementById('building-list');
    
    // Sort the building names alphabetically
    const sortedBuildingNames = Object.keys(buildings).sort();
    
    // Create clickable elements for each building
    sortedBuildingNames.forEach(buildingName => {
        const buildingElement = document.createElement('p');
        buildingElement.className = 'clickable-building';
        buildingElement.textContent = buildingName;
        
        // Add click event to navigate to the building
        buildingElement.addEventListener('click', function() {
            // Center the map on the building
            map.setView(buildings[buildingName].coordinates, 19);
            
            // Create and open a popup for the building
            const popup = L.popup()
                .setLatLng(buildings[buildingName].coordinates)
                .setContent(`<div class="building-popup"><h3>${buildingName}</h3></div>`)
                .openOn(map);
            
            // Close dropdown after selection
            const dropdown = document.querySelector('.dropdown');
            dropdown.classList.remove('active');
        });
        
        buildingListDropdown.appendChild(buildingElement);
    });

    // Add scroll buttons to the building list - one above and one below
    const buildingList = document.getElementById('building-list');

    // Create up button and insert before the list
    const scrollUpBtn = document.createElement('button');
    scrollUpBtn.className = 'scroll-btn scroll-btn-up';
    scrollUpBtn.textContent = '▲'; // Just the up arrow
    scrollUpBtn.addEventListener('click', function() {
        buildingList.scrollBy({
            top: -100,
            behavior: 'smooth'
        });
    });

    // Insert the up button before the building list
    buildingList.parentNode.insertBefore(scrollUpBtn, buildingList);

    // Create down button and insert after the list
    const scrollDownBtn = document.createElement('button');
    scrollDownBtn.className = 'scroll-btn scroll-btn-down';
    scrollDownBtn.textContent = '▼'; // Just the down arrow
    scrollDownBtn.addEventListener('click', function() {
        buildingList.scrollBy({
            top: 100,
            behavior: 'smooth'
        });
    });

    // Insert the down button after the building list
    buildingList.parentNode.insertBefore(scrollDownBtn, buildingList.nextSibling);

    // Travel mode buttons
    const modeWalkBtn = document.getElementById('mode-walk');
    const modeDriveBtn = document.getElementById('mode-drive');
    const modeBikeBtn = document.getElementById('mode-bike');
    
    // Add click event listeners
    modeWalkBtn.addEventListener('click', function() {
        // function implementation to be removed
    });
    
    modeDriveBtn.addEventListener('click', function() {
        // function implementation to be removed
    });
    
    modeBikeBtn.addEventListener('click', function() {
        // function implementation to be removed
    });
    
    // Function to set travel mode
    function setTravelMode(mode, button) {
        // function implementation to be removed
    }
    
    // Function to set up the observer for route panel
    function setupRouteObserver() {
        // Wait for the container to be created
        setTimeout(() => {
            const routingContainer = document.querySelector('.leaflet-routing-container');
            if (routingContainer) {
                // Create observer
                observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        if (mutation.attributeName === 'class') {
                            const isCollapsed = routingContainer.classList.contains('leaflet-routing-container-hide');
                            routingSearchContainer.classList.toggle('hidden', isCollapsed);
                            
                            if (isCollapsed) {
                                // Store waypoints before clearing
                                lastWaypoints = routeCtrl.getWaypoints()
                                    .filter(wp => wp.latLng !== null)
                                    .map(wp => L.latLng(wp.latLng.lat, wp.latLng.lng));
                                
                                // Clear route
                                routeCtrl.setWaypoints([]);
                                
                                // Remove paw prints
                                activeMarkers.forEach(marker => map.removeLayer(marker));
                                activeMarkers = [];
                            } else if (lastWaypoints.length >= 2) {
                                // Restore route
                                routeCtrl.setWaypoints(lastWaypoints);
                            }
                        }
                    });
                });
                
                // Start observing
                observer.observe(routingContainer, { attributes: true });
            }
        }, 100); // Short delay to ensure container exists
    }

    // Call this in your document ready or initialization code
    initializeRouting();

    // Add event listener for the tracking toggle
    const trackToggle = document.getElementById('track-location');
    
    if (trackToggle) {
        trackToggle.addEventListener('change', function() {
            if (this.checked) {
                startLocationTracking();
            } else {
                stopLocationTracking();
            }
        });
    }
});

// Create variables to hold the global routing control and its initial travel mode
let globalTravelMode = 'pedestrian'; // Default to walking

// Function to initialize the routing control - called only once at startup
function initializeRouting() {
    // Create routing control with the initial travel mode
    routeCtrl = L.Routing.control({
        waypoints: [],
        routeWhileDragging: true,
        router: L.Routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1',
            profile: globalTravelMode
        }),
        lineOptions: {
            styles: [{color: 'black', opacity: 0.15, weight: 9}, 
                    {color: '#FDB515', opacity: 0.8, weight: 6}]
        },
        formatter: customFormatter,
        collapsible: true,
        showAlternatives: false,
        addWaypoints: false
    }).addTo(map);
    
    // Setup the event listener for route calculation
    routeCtrl.on('routeselected', onRouteSelected);
    
    // Setup observer for tracking UI state
    setupRouteObserver();
}

// Event handler for route selection
function onRouteSelected(e) {
    // Handle paw print markers
    const routeCoordinates = e.route.coordinates;
    
    // Clear previous paw prints
    activeMarkers.forEach(marker => map.removeLayer(marker));
    activeMarkers = [];
    
    // Place new paw prints
    const intervalDistance = 25; // in meters
    let accumulatedDistance = 0;
    let lastPrintCoord = routeCoordinates[0];
    
    for (let i = 1; i < routeCoordinates.length; i++) {
        const currentCoord = routeCoordinates[i];
        const segmentDistance = lastPrintCoord.distanceTo(currentCoord);
        
        accumulatedDistance += segmentDistance;
        
        while (accumulatedDistance >= intervalDistance) {
            // Calculate paw print placement
            const overshoot = accumulatedDistance - intervalDistance;
            const fraction = 1 - (overshoot / segmentDistance);
            
            const lat = lastPrintCoord.lat + fraction * (currentCoord.lat - lastPrintCoord.lat);
            const lng = lastPrintCoord.lng + fraction * (currentCoord.lng - lastPrintCoord.lng);
            
            const pawPrintMarker = L.marker([lat, lng], { icon: pawPrintIcon }).addTo(map);
            activeMarkers.push(pawPrintMarker);
            
            accumulatedDistance -= intervalDistance;
            lastPrintCoord = L.latLng(lat, lng);
        }
        
        lastPrintCoord = currentCoord;
    }
    
    // Handle mobile instructions if needed
    if (isMobile && window.mobileRoutingElements) {
        // Process and display mobile instructions
    }
}

// Function to set up the observer for route panel
function setupRouteObserver() {
    // Wait for the container to be created
    setTimeout(() => {
        const routingContainer = document.querySelector('.leaflet-routing-container');
        if (routingContainer) {
            // Create observer
            observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.attributeName === 'class') {
                        const isCollapsed = routingContainer.classList.contains('leaflet-routing-container-hide');
                        routingSearchContainer.classList.toggle('hidden', isCollapsed);
                        
                        if (isCollapsed) {
                            // Store waypoints before clearing
                            lastWaypoints = routeCtrl.getWaypoints()
                                .filter(wp => wp.latLng !== null)
                                .map(wp => L.latLng(wp.latLng.lat, wp.latLng.lng));
                            
                            // Clear route
                            routeCtrl.setWaypoints([]);
                            
                            // Remove paw prints
                            activeMarkers.forEach(marker => map.removeLayer(marker));
                            activeMarkers = [];
                        } else if (lastWaypoints.length >= 2) {
                            // Restore route
                            routeCtrl.setWaypoints(lastWaypoints);
                        }
                    }
                });
            });
            
            // Start observing
            observer.observe(routingContainer, { attributes: true });
        }
    }, 100); // Short delay to ensure container exists
}

// Call this in your document ready or initialization code
initializeRouting();

// Add this function to handle location tracking
function startLocationTracking() {
    // Don't start tracking if already tracking
    if (isTrackingLocation) return;
    
    // Check if geolocation is available
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
    }
    
    // Create a user location marker with a blue dot
    if (!userLocationMarker) {
        const userIcon = L.divIcon({
            className: 'user-location-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        userLocationMarker = L.marker([0, 0], { icon: userIcon }).addTo(map);
        userLocationMarker.bindPopup("You are here").openPopup();
    }
    
    // Start watching position
    locationWatchId = navigator.geolocation.watchPosition(
        // Success callback
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            
            // Update marker position
            userLocationMarker.setLatLng([lat, lng]);
            
            // Add an accuracy circle
            if (userLocationMarker.accuracyCircle) {
                userLocationMarker.accuracyCircle.setLatLng([lat, lng]).setRadius(accuracy);
            } else {
                userLocationMarker.accuracyCircle = L.circle([lat, lng], {
                    radius: accuracy,
                    color: '#4285F4',
                    fillColor: '#4285F433',
                    weight: 1
                }).addTo(map);
            }
            
            // Update input field if it's set to "My Location"
            const startInput = document.getElementById('route-start');
            if (startInput.value === "My Location") {
                startInput.dataset.lat = lat;
                startInput.dataset.lng = lng;
                
                // If there's an active route with "My Location" as starting point, update it
                updateRouteIfUsingMyLocation();
            }
            
            isTrackingLocation = true;
        },
        // Error callback
        function(error) {
            console.error('Error getting location:', error);
            stopLocationTracking();
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    alert("Location tracking was denied. Please enable location services.");
                    break;
                case error.POSITION_UNAVAILABLE:
                    alert("Location information is unavailable.");
                    break;
                case error.TIMEOUT:
                    alert("The request to get your location timed out.");
                    break;
                default:
                    alert("An unknown error occurred while tracking your location.");
                    break;
            }
        },
        // Options
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Function to stop tracking location
function stopLocationTracking() {
    if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
        locationWatchId = null;
        
        // Remove marker and accuracy circle
        if (userLocationMarker) {
            if (userLocationMarker.accuracyCircle) {
                map.removeLayer(userLocationMarker.accuracyCircle);
                userLocationMarker.accuracyCircle = null;
            }
            map.removeLayer(userLocationMarker);
            userLocationMarker = null;
        }
        
        isTrackingLocation = false;
    }
}

// Function to update route if using My Location
function updateRouteIfUsingMyLocation() {
    const startInput = document.getElementById('route-start');
    const endInput = document.getElementById('route-end');
    
    if (startInput.value === "My Location" && 
        startInput.dataset.lat && 
        startInput.dataset.lng && 
        endInput.value && 
        !routingContainer.classList.contains('leaflet-routing-container-hide')) {
        
        const userLat = parseFloat(startInput.dataset.lat);
        const userLng = parseFloat(startInput.dataset.lng);
        const endLocation = endInput.value.trim().toLowerCase();
        
        if (endLocation in shorthandInputs) {
            const endBuilding = shorthandInputs[endLocation];
            
            // Get the current waypoints
            const waypoints = routeCtrl.getWaypoints();
            
            // Only update if we have exactly two waypoints (start and end)
            if (waypoints.length === 2) {
                // Update only the start waypoint
                waypoints[0].latLng = L.latLng(userLat, userLng);
                routeCtrl.setWaypoints(waypoints);
            }
        }
    }
}

// Clean up tracking when leaving the page
window.addEventListener('beforeunload', function() {
    if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
    }
});

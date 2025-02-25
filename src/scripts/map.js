// initialize the map centered on UMBC
var map = L.map('map').setView([39.2557, -76.7110], 16.5); // Zoom level adjusted for campus view

// add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 22
}).addTo(map);

//function to handle search
document.getElementById('search-place').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent form submission from reloading page

    let searchQuery = document.getElementById('search-input').value.trim().toLowerCase();

    console.log(searchQuery);
    
    // Simple example of location search (you can expand this with a geocoding API)
    let locations = {
        "library": [39.25667559895507, -76.7114586334517],
        "engineering": [39.254555501219464, -76.71398975776958],
        "the commons": [39.25504286859576, -76.71083025620784],
        "meyerhoff" : [39.25511090168331, -76.71308734954944],
        "university center" : [39.254408957062566, -76.71323323232562],
        "math and psych" : [39.254112752021825, -76.71248336030052],
        "sondheim" : [39.25340638958231, -76.71285527327186],
        "sherman" : [39.25362836639402, -76.71318988838087],
        "admin": [39.253085935735285, -76.71349304557097],
        "rac" : [39.25287578788468, -76.7125462338403],
        "ite" : [39.25386101575018, -76.71421287389691],
        "fine arts" : [39.25507603183645, -76.71343503328272],
        "pahb" : [39.25513107394284, -76.71522879994653],
        "true grits" : [39.255799179683635, -76.70774156023795],
        "public policy": [39.255243622719654, -76.70909260896087],
        "physics": [39.254561443143906, -76.7096894043524],
        "wellness center": [39.25625954451121, -76.7089931430609],
        "walker" : [39.25951545690176, -76.71383393603841],
        "erickson" : [39.25729668169126, -76.70971568231944],
        "susquehanna" : [39.25565072671618, -76.708557387695],
        "potomac" : [39.255911506758686, -76.7066255015616],
        "patapsco" : [39.255246568074476, -76.70697080963215],
        "chesapeake" : [39.256854371952976, -76.70873369819478],
        "harbor" : [39.25722729276396, -76.70861102295869],
        "ec" : [39.25238268597456, -76.70746605409829],
        "stadium" : [39.25050737796925, -76.70751148936868],
    };

    if (locations[searchQuery]) {
        map.flyTo(locations[searchQuery], 19); // Zoom in and move to location
    } else {
        alert("Location not found!");
    }
});
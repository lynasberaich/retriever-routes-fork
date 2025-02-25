// Initialize the map centered on UMBC
var map = L.map('map').setView([39.2557, -76.7110], 16.5); // Zoom level adjusted for campus view

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18
}).addTo(map);

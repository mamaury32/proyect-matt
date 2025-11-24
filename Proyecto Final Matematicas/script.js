// --- CONFIGURACIÓN INICIAL ---
const map = L.map('map', {
    crs: L.CRS.Simple, // Coordenadas cartesianas
    minZoom: -2,
    maxZoom: 2,
    zoomControl: false
});

// Variables globales
let imageLayer = null; // Capa de imagen actual
let puntos = [];
let marcadores = [];
let lineas = [];
let poligonoActual = null;

// Cargar una imagen por defecto al iniciar (Grid técnico de ejemplo)
cargarImagenEnMapa('https://planner5d.com/blog/content/images/2024/08/planos.casas.8.jpg');


// --- LÓGICA DE CARGA DE IMAGEN (FILE API) ---
document.getElementById('input-imagen').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Usamos FileReader para leer el archivo local sin subirlo a internet
    const reader = new FileReader();
    
    reader.onload = function(event) {
        const imageUrl = event.target.result; // Data URL de la imagen
        reiniciar(); // Limpiar cualquier dibujo previo
        cargarImagenEnMapa(imageUrl);
    };
    
    reader.readAsDataURL(file);
});

function cargarImagenEnMapa(url) {
    // Creamos un objeto imagen temporal para saber sus dimensiones reales
    const img = new Image();
    
    img.onload = function() {
        const w = this.width;
        const h = this.height;
        
        // Definir los límites del mapa basados en la imagen: [[0,0], [Alto, Ancho]]
        // Leaflet usa [Y, X], por eso es [h, w]
        const bounds = [[0,0], [h, w]];

        // Si ya existe una capa de imagen, la quitamos
        if (imageLayer) {
            map.removeLayer(imageLayer);
        }

        // Añadimos la nueva imagen
        imageLayer = L.imageOverlay(url, bounds).addTo(map);
        
        // Centramos la vista en la nueva imagen
        map.fitBounds(bounds);
    }
    
    img.src = url;
}


// --- LÓGICA DE DIBUJO Y CÁLCULO

document.getElementById('btn-calcular').addEventListener('click', cerrarPoligono);
document.getElementById('btn-reiniciar').addEventListener('click', reiniciar);

map.on('click', function(e) {
    if (poligonoActual) reiniciar();

    const lat = e.latlng.lat; 
    const lng = e.latlng.lng;
    
    puntos.push({x: lng, y: lat});

    const marker = L.circleMarker([lat, lng], {
        color: '#00d2ff', fillColor: '#00d2ff', fillOpacity: 1, radius: 4
    }).addTo(map);
    marcadores.push(marker);

    if (puntos.length > 1) {
        const ultimoPunto = puntos[puntos.length - 2];
        const linea = L.polyline([
            [ultimoPunto.y, ultimoPunto.x], 
            [lat, lng]
        ], {color: '#00d2ff', weight: 2, dashArray: '5, 5'}).addTo(map);
        lineas.push(linea);
    }

    actualizarInfoPanel();
});

function actualizarInfoPanel() {
    document.getElementById('coords-display').innerText = `Vértices actuales: ${puntos.length}`;
}

function calcularAreaShoelace(listaPuntos) {
    let area = 0;
    const n = listaPuntos.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += (listaPuntos[i].x * listaPuntos[j].y);
        area -= (listaPuntos[j].x * listaPuntos[i].y);
    }
    return Math.abs(area) / 2.0;
}

function cerrarPoligono() {
    if (puntos.length < 3) {
        alert("Se necesitan al menos 3 puntos para formar un área.");
        return;
    }
    const area = calcularAreaShoelace(puntos);
    const latlngs = puntos.map(p => [p.y, p.x]);
    
    limpiarTemporales();
    
    poligonoActual = L.polygon(latlngs, {
        color: '#00d2ff', fillColor: '#00d2ff', fillOpacity: 0.3
    }).addTo(map);

    const centro = poligonoActual.getBounds().getCenter();
    L.marker(centro, {
        icon: L.divIcon({
            className: 'custom-tooltip',
            html: `<div style="font-size:1.2em; text-align:center; background: rgba(0,0,0,0.5); padding:2px; border-radius:4px;">${area.toFixed(2)} px²</div>`
        })
    }).addTo(map);

    document.getElementById('area-value').innerText = area.toFixed(2);
}

function limpiarTemporales() {
    lineas.forEach(l => map.removeLayer(l));
    marcadores.forEach(m => map.removeLayer(m));
    lineas = [];
    marcadores = [];
}

function reiniciar() {
    limpiarTemporales();
    if (poligonoActual) map.removeLayer(poligonoActual);
    map.eachLayer(function (layer) {
        if (layer instanceof L.Marker && layer.options.icon && layer.options.icon.options.className === 'custom-tooltip') {
            map.removeLayer(layer);
        }
    });
    puntos = [];
    poligonoActual = null;
    document.getElementById('area-value').innerText = "0.00";
    actualizarInfoPanel();
}
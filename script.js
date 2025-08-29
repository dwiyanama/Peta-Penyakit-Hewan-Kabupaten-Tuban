// URL CSV publik dari Google Sheets
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR9MVSXX7D5_0zFcUAd9UQe-_MLxKazDvplEMgAYNvyPCgB1yzBc6mQ_0w4gEtSRAuOFu9aVyTMK3Ve/pub?output=csv";

let map = L.map("map").setView([-7.1, 112.05], 10);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let markersLayer = L.layerGroup().addTo(map);
let allData = [];

// Palet warna untuk penyakit
const colorPalette = ["red","blue","green","orange","purple","brown","black","pink","teal"];
const colorMap = {};
function getColorForDisease(disease) {
  if (!colorMap[disease]) {
    const idx = Object.keys(colorMap).length % colorPalette.length;
    colorMap[disease] = colorPalette[idx];
  }
  return colorMap[disease];
}
function createIcon(disease) {
  const color = getColorForDisease(disease);
  return L.divIcon({
    className: "custom-marker",
    html: `<i class="fas fa-map-marker-alt" style="color:${color}; font-size:24px;"></i>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  });
}

// Chart.js
let chartCtx = document.getElementById("chart").getContext("2d");
let chart = new Chart(chartCtx, {
  type: "bar",
  data: { labels: [], datasets: [{ label: "Jumlah Kasus", data: [], backgroundColor: [] }] },
  options: { responsive: true, plugins: { legend: { display: false } } }
});

// Load data dari CSV
Papa.parse(CSV_URL, {
  download: true,
  header: true,
  complete: function(results) {
    allData = results.data.map(d => ({
      penyakit: d.Penyakit || d.penyakit || "",
      kecamatan: d.Kecamatan || d.kecamatan || "",
      desa: d.Desa || d.desa || "",
      lat: parseFloat(d.Lat || d.lat || d.Latitude || d.latitude),
      lng: parseFloat(d.Lng || d.lng || d.Longitude || d.longitude),
      jumlah: parseInt(d.Jumlah || d.jumlah || d.Count || d.count) || 0,
      tahun: d.Tahun || d.tahun || "",
      bulan: d.Bulan || d.bulan || "",
      deskripsi: d.Deskripsi || d.deskripsi || "",
      gambar: d.Gambar || d.gambar || "",
      kontak: d.Kontak || d.kontak || ""
    }));
    populateFilters();
    updateMapAndChart();
  }
});

function populateFilters() {
  populateSelect("filterKecamatan", [...new Set(allData.map(d => d.kecamatan).filter(Boolean))]);
  populateSelect("filterPenyakit", [...new Set(allData.map(d => d.penyakit).filter(Boolean))]);
  populateSelect("filterTahun", [...new Set(allData.map(d => d.tahun).filter(Boolean))]);
  populateSelect("filterBulan", [...new Set(allData.map(d => d.bulan).filter(Boolean))]);

  document.getElementById("filterKecamatan").addEventListener("change", function() {
    const selectedKecamatan = this.value;
    let desaSet = allData.filter(d => !selectedKecamatan || d.kecamatan === selectedKecamatan)
                         .map(d => d.desa).filter(Boolean);
    populateSelect("filterDesa", [...new Set(desaSet)]);
    updateMapAndChart();
  });
  ["filterDesa","filterPenyakit","filterTahun","filterBulan"].forEach(id => {
    document.getElementById(id).addEventListener("change", updateMapAndChart);
  });
}

function populateSelect(id, values) {
  const sel = document.getElementById(id);
  sel.innerHTML = "<option value=''>Semua</option>";
  values.sort().forEach(v => {
    let opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    sel.appendChild(opt);
  });
}

function updateMapAndChart() {
  markersLayer.clearLayers();
  let fKec = document.getElementById("filterKecamatan").value;
  let fDesa = document.getElementById("filterDesa").value;
  let fPenyakit = document.getElementById("filterPenyakit").value;
  let fTahun = document.getElementById("filterTahun").value;
  let fBulan = document.getElementById("filterBulan").value;

  let filtered = allData.filter(d =>
    (!fKec || d.kecamatan === fKec) &&
    (!fDesa || d.desa === fDesa) &&
    (!fPenyakit || d.penyakit === fPenyakit) &&
    (!fTahun || d.tahun === fTahun) &&
    (!fBulan || d.bulan === fBulan)
  );

  filtered.forEach(p => {
    if (isNaN(p.lat) || isNaN(p.lng)) return;
    console.log("Gambar:", p.gambar);
    let popupContent = `
      <b>Penyakit:</b> ${p.penyakit}<br>
      <b>Kecamatan:</b> ${p.kecamatan}<br>
      <b>Desa:</b> ${p.desa}<br>
      <b>Jumlah:</b> ${p.jumlah}<br>
      <b>Tahun/Bulan:</b> ${p.tahun}/${p.bulan}<br>
      <b>Deskripsi:</b><br>${p.deskripsi}<br>
      ${p.gambar ? `<img src="${p.gambar}" alt="gambar" style="max-width:100%;margin-top:5px;">` : ""}
      ${p.kontak ? `<br><b>Kontak:</b> ${p.kontak}` : ""}
    `;
    let marker = L.marker([p.lat, p.lng], { icon: createIcon(p.penyakit) }).addTo(markersLayer);
    marker.bindPopup(popupContent);
  });

  // Update chart
  let counts = {};
  filtered.forEach(p => {
    counts[p.penyakit] = (counts[p.penyakit] || 0) + p.jumlah;
  });
  chart.data.labels = Object.keys(counts);
  chart.data.datasets[0].data = Object.values(counts);
  chart.data.datasets[0].backgroundColor = chart.data.labels.map(getColorForDisease);
  chart.update();
}

// URL CSV publik dari Google Sheets
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT5Rc7mU55Xj1OOPc2961fQVyj13CXscIWVrcfY0jRWnH8jjfCIftMnE4yIzRNVRUOoeIInU3fcPG1N/pub?output=csv";

let map = L.map("map").setView([-7.1, 112.05], 10);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let markersLayer = L.layerGroup().addTo(map);
let allData = [];

// Palet warna untuk penyakit (30 warna)
const colorPalette = [
  "#e6194b","#3cb44b","#ffe119","#4363d8","#f58231","#911eb4","#46f0f0","#f032e6",
  "#bcf60c","#fabebe","#008080","#e6beff","#9a6324","#fffac8","#800000","#aaffc3",
  "#808000","#ffd8b1","#000075","#808080","#a9a9a9","#ff4500","#2e8b57","#1e90ff",
  "#daa520","#c71585","#20b2aa","#ff6347","#4682b4","#d2691e","#7fff00","#dc143c"
];
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
  data: {
    labels: [], // Nama penyakit
    datasets: [{
      label: "Jumlah Kasus",
      data: [],
      backgroundColor: []
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    layout: {
      padding: { bottom: 30 }
    },
    scales: {
      x: {
        ticks: {
          color: "#1565c0",
          font: { size: 13 },
          maxRotation: 90,
          minRotation: 90,
          align: "center",
          autoSkip: false, // <-- Penting agar semua label tampil!
        }
      },
      y: {
        beginAtZero: true
      }
    }
  }
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
  // Urutkan abjad untuk kecamatan, penyakit, tahun
  const kecamatanSet = [...new Set(allData.map(d => d.kecamatan).filter(Boolean))].sort();
  const penyakitSet = [...new Set(allData.map(d => d.penyakit).filter(Boolean))].sort();
  const tahunSet = [...new Set(allData.map(d => d.tahun).filter(Boolean))].sort();

  populateSelect("filterKecamatan", kecamatanSet);
  populateSelect("filterPenyakit", penyakitSet);
  populateSelect("filterTahun", tahunSet);

  // Urutan bulan kalender
  const bulanKalender = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  let bulanSet = [...new Set(allData.map(d => d.bulan).filter(Boolean))];
  bulanSet = bulanKalender.filter(b => bulanSet.includes(b));
  populateSelect("filterBulan", bulanSet);

  document.getElementById("filterKecamatan").addEventListener("change", function() {
    const selectedKecamatan = this.value;
    // Desa diurutkan abjad
    let desaSet = allData.filter(d => !selectedKecamatan || d.kecamatan === selectedKecamatan)
                         .map(d => d.desa).filter(Boolean);
    desaSet = [...new Set(desaSet)].sort();
    populateSelect("filterDesa", desaSet);
    updateMapAndChart();
  });
  ["filterDesa","filterPenyakit","filterTahun","filterBulan"].forEach(id => {
    document.getElementById(id).addEventListener("change", updateMapAndChart);
  });
}

function populateSelect(id, values) {
  const sel = document.getElementById(id);
  sel.innerHTML = "<option value=''>Semua</option>";
  values.forEach(v => {
    let opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    sel.appendChild(opt);
  });
}

function updateMapAndChart() {
  // Ambil filter
  const kecamatan = document.getElementById("filterKecamatan").value;
  const desa = document.getElementById("filterDesa").value;
  const penyakit = document.getElementById("filterPenyakit").value;
  const tahun = document.getElementById("filterTahun").value;
  const bulan = document.getElementById("filterBulan").value;

  // Filter data sesuai pilihan
  let filtered = allData.filter(d =>
    (!kecamatan || d.kecamatan === kecamatan) &&
    (!desa || d.desa === desa) &&
    (!penyakit || d.penyakit === penyakit) &&
    (!tahun || d.tahun === tahun) &&
    (!bulan || d.bulan === bulan)
  );

  // Update chart (sesuai kode kamu sekarang)
  if (penyakit) {
    const kecamatanList = [...new Set(filtered.map(d => d.kecamatan).filter(Boolean))].sort();
    const dataPerKecamatan = kecamatanList.map(kec => {
      return filtered.filter(d => d.kecamatan === kec)
                     .reduce((sum, d) => sum + d.jumlah, 0);
    });

    chart.data.labels = kecamatanList;
    chart.data.datasets[0].data = dataPerKecamatan;
    chart.data.datasets[0].backgroundColor = kecamatanList.map(() => "#1565c0");
    chart.data.datasets[0].label = `Jumlah Kasus ${penyakit}`;
    chart.update();
  } else {
    const penyakitList = [...new Set(filtered.map(d => d.penyakit).filter(Boolean))].sort();
    const dataPerPenyakit = penyakitList.map(p => {
      return filtered.filter(d => d.penyakit === p)
                     .reduce((sum, d) => sum + d.jumlah, 0);
    });

    chart.data.labels = penyakitList;
    chart.data.datasets[0].data = dataPerPenyakit;
    chart.data.datasets[0].backgroundColor = penyakitList.map(getColorForDisease);
    chart.data.datasets[0].label = "Jumlah Kasus";
    chart.update();
  }

  // Update marker di peta
  markersLayer.clearLayers();
  filtered.forEach(d => {
    if (!isNaN(d.lat) && !isNaN(d.lng)) {
      const marker = L.marker([d.lat, d.lng], { icon: createIcon(d.penyakit) });
      let popupHtml = `<b>${d.penyakit}</b><br>
        <b>Kecamatan:</b> ${d.kecamatan}<br>
        <b>Desa:</b> ${d.desa}<br>
        <b>Jumlah:</b> ${d.jumlah}<br>
        <b>Tahun:</b> ${d.tahun}<br>
        <b>Bulan:</b> ${d.bulan}`;
      if (d.deskripsi) popupHtml += `<br><b>Deskripsi:</b> ${d.deskripsi}`;
      if (d.gambar) popupHtml += `<br><img src="${d.gambar}" style="max-width:120px;">`;
      if (d.kontak) popupHtml += `<br><b>Kontak:</b> ${d.kontak}`;
      marker.bindPopup(popupHtml);
      markersLayer.addLayer(marker);
    }
  });
}

// Contoh: load geojson batas Tuban
fetch('tuban.geojson')
  .then(res => res.json())
  .then(geojson => {
    // Polygon besar (seluruh area peta)
    const outer = [
      [ -8.5, 111.0 ],
      [ -8.5, 113.5 ],
      [ -6.5, 113.5 ],
      [ -6.5, 111.0 ],
      [ -8.5, 111.0 ]
    ];

    // Ambil koordinat polygon Tuban dari geojson
    const tubanCoords = geojson.features[0].geometry.coordinates;

    // Buat mask: area luar minus area Tuban
    const mask = [outer];
    tubanCoords.forEach(poly => mask.push(poly[0]));

    // Tambahkan polygon mask ke peta
    L.polygon(mask, {
      color: "#888",
      fillColor: "#888",
      fillOpacity: 0.5,
      stroke: false
    }).addTo(map);
  });

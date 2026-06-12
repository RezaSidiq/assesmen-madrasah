// modules/remedial.js - Mencari siswa remedial (TAMPILAN TABEL + EXPORT CSV)

const fs = require('fs');
const path = require('path');
const { getAllSiswa, getSiswaByKelas, getDB } = require('./database.js');
const { validateKelas, validateMapelWithExistence, validateNISNForUpdate, displayErrors } = require('./validator.js');
const { hitungNilaiAkhir } = require('./utils.js');

// Fungsi export ke CSV
async function exportRemedialToCSV(remedialData, filterInfo) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `export_remedial_${filterInfo.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.csv`;
    
    const headers = ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 'Nilai Akhir', 'Teori', 'Praktek', 'Sikap', 'Kehadiran'];
    
    const rows = remedialData.map((item, index) => [
        index + 1,
        item.nisn,
        item.nama,
        item.kelas,
        item.mapel,
        item.nilaiAkhir,
        item.teori,
        item.praktek,
        item.sikap,
        item.kehadiran
    ]);
    
    const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const bom = '\uFEFF';
    fs.writeFileSync(filename, bom + csvContent, 'utf8');
    
    console.log(`\n📁 File CSV berhasil diexport: ${filename}`);
    console.log(`   Lokasi: ${path.resolve(filename)}`);
    console.log(`   Jumlah data: ${rows.length} baris`);
    
    return filename;
}

async function getRemedialSiswa(kelas = null, mapel = null, nisn = null, filterType = null, exportFlag = false) {
    console.log(`\n🔍 MENCARI SISWA DENGAN NILAI AKHIR REMEDIAL (<70)`);
    
    let siswaList = [];
    let filterInfo = '';
    let filterValue = '';
    
    // ==================== CASE 1: Filter by NISN ====================
    if (filterType === 'nisn' && nisn) {
        filterInfo = `NISN_${nisn}`;
        console.log(`📋 Filter: NISN = ${nisn}`);
        
        const nisnValidation = await validateNISNForUpdate(nisn);
        if (!nisnValidation.valid) {
            displayErrors(nisnValidation.errors);
            return;
        }
        
        const dataSiswa = await getDataSiswa(nisn);
        if (dataSiswa) {
            siswaList.push({
                nisn: nisn,
                nama: dataSiswa.nama || '-',
                kelas: dataSiswa.kelas || '-',
                jk: dataSiswa.jk || '-',
                ttl: dataSiswa.ttl || '-'
            });
            filterValue = nisn;
        } else {
            console.log(`❌ Siswa dengan NISN ${nisn} tidak ditemukan`);
            return;
        }
        
    // ==================== CASE 2: Filter by KELAS ====================
    } else if (filterType === 'kelas' && kelas) {
        filterInfo = `KELAS_${kelas.replace(/[^a-zA-Z0-9]/g, '_')}`;
        console.log(`📋 Filter: Kelas = ${kelas}`);
        
        const kelasValidation = await validateKelas(kelas, true);
        if (!kelasValidation.valid) {
            displayErrors(kelasValidation.errors);
            return;
        }
        
        siswaList = await getSiswaByKelas(kelas);
        filterValue = kelas;
        
    // ==================== CASE 3: Filter by MAPEL ====================
    } else if (filterType === 'mapel' && mapel) {
        filterInfo = `MAPEL_${mapel.replace(/[^a-zA-Z0-9]/g, '_')}`;
        console.log(`📋 Filter: Mapel = ${mapel}`);
        
        const mapelValidation = await validateMapelWithExistence(mapel);
        if (!mapelValidation.valid) {
            displayErrors(mapelValidation.errors);
            return;
        }
        
        const semuaSiswa = await getAllSiswa();
        for (let nisn in semuaSiswa) {
            siswaList.push({
                nisn: nisn,
                nama: semuaSiswa[nisn].nama || '-',
                kelas: semuaSiswa[nisn].kelas || '-'
            });
        }
        filterValue = mapel;
        
    // ==================== CASE 4: No filter (semua siswa) ====================
    } else {
        filterInfo = 'SEMUA_SISWA';
        console.log(`📋 Filter: Semua Siswa`);
        
        const semuaSiswa = await getAllSiswa();
        for (let nisn in semuaSiswa) {
            siswaList.push({
                nisn: nisn,
                nama: semuaSiswa[nisn].nama || '-',
                kelas: semuaSiswa[nisn].kelas || '-'
            });
        }
        filterValue = 'semua';
    }
    
    if (siswaList.length === 0) {
        console.log(`❌ Tidak ada siswa ditemukan`);
        return;
    }
    
    console.log(`📊 Total siswa diproses: ${siswaList.length}\n`);
    
    // Tentukan mapel yang akan diperiksa
    let mapelList = [];
    if (filterType === 'mapel' && mapel) {
        mapelList = [mapel];
        console.log(`📚 Mata Pelajaran yang diperiksa: ${mapel}\n`);
    } else {
        const db = getDB();
        const nilaiSnapshot = await db.ref('nilai').once('value');
        const mapelSet = new Set();
        if (nilaiSnapshot.exists()) {
            const data = nilaiSnapshot.val();
            for (let nisn in data) {
                Object.keys(data[nisn]).forEach(m => mapelSet.add(m));
            }
        }
        mapelList = Array.from(mapelSet).sort();
        console.log(`📚 Mata Pelajaran yang diperiksa: ${mapelList.length} mapel\n`);
    }
    
    // Kumpulkan data remedial
    const remedialData = [];
    const db = getDB();
    
    for (const siswa of siswaList) {
        const [teoriSnapshot, praktekSnapshot, sikapSnapshot, kehadiranSnapshot] = await Promise.all([
            db.ref(`nilai/${siswa.nisn}`).once('value'),
            db.ref(`nilai_praktek/${siswa.nisn}`).once('value'),
            db.ref(`nilai_sikap/${siswa.nisn}`).once('value'),
            db.ref(`kehadiran/${siswa.nisn}`).once('value')
        ]);
        
        const nilaiTeori = teoriSnapshot.exists() ? teoriSnapshot.val() : {};
        const nilaiPraktek = praktekSnapshot.exists() ? praktekSnapshot.val() : {};
        const nilaiSikap = sikapSnapshot.exists() ? sikapSnapshot.val() : {};
        const nilaiKehadiran = kehadiranSnapshot.exists() ? kehadiranSnapshot.val() : {};
        
        for (const m of mapelList) {
            const teori = nilaiTeori[m] !== undefined ? nilaiTeori[m] : null;
            const praktek = nilaiPraktek[m] !== undefined ? nilaiPraktek[m] : null;
            const sikap = nilaiSikap[m] !== undefined ? nilaiSikap[m] : null;
            const kehadiran = nilaiKehadiran[m] !== undefined ? nilaiKehadiran[m] : null;
            
            if (teori !== null && praktek !== null && kehadiran !== null) {
                const nilaiAkhir = hitungNilaiAkhir(teori, praktek, sikap, kehadiran);
                if (nilaiAkhir < 70) {
                    remedialData.push({
                        nisn: siswa.nisn,
                        nama: siswa.nama,
                        kelas: siswa.kelas,
                        mapel: m,
                        nilaiAkhir: nilaiAkhir.toFixed(2),
                        teori: teori,
                        praktek: praktek,
                        sikap: sikap,
                        kehadiran: kehadiran
                    });
                }
            }
        }
    }
    
    if (remedialData.length === 0) {
        console.log(`\n✅ Tidak ada siswa dengan nilai remedial!`);
        return;
    }
    
    // Urutkan berdasarkan kelas, kemudian nama
    remedialData.sort((a, b) => {
        if (a.kelas !== b.kelas) return a.kelas.localeCompare(b.kelas);
        if (a.nama !== b.nama) return a.nama.localeCompare(b.nama);
        return a.mapel.localeCompare(b.mapel);
    });
    
    // Tampilkan tabel
    displayRemedialTable(remedialData, filterType, filterValue);
    
    // Export jika diminta
    if (exportFlag) {
        console.log(`\n📁 Mengexport ke CSV...`);
        await exportRemedialToCSV(remedialData, filterInfo);
    }
    
    // Ringkasan
    const totalSiswaRemedial = new Set(remedialData.map(r => r.nisn)).size;
    console.log('\n' + '='.repeat(145));
    console.log(`📊 RINGKASAN REMEDIAL`);
    console.log('='.repeat(145));
    console.log(`   👨‍🎓 Jumlah siswa remedial : ${totalSiswaRemedial} dari ${siswaList.length} siswa`);
    console.log(`   ⚠️  Total nilai remedial  : ${remedialData.length} mata pelajaran`);
    if (exportFlag) {
        console.log(`   📁 Export CSV           : Ya`);
    }
    console.log('='.repeat(145));
}

function displayRemedialTable(data, filterType, filterValue) {
    let title = '';
    if (filterType === 'kelas') title = `Kelas: ${filterValue}`;
    else if (filterType === 'mapel') title = `Mapel: ${filterValue}`;
    else if (filterType === 'nisn') title = `NISN: ${filterValue}`;
    else title = 'Semua Siswa';
    
    console.log('='.repeat(150));
    console.log(`📋 DAFTAR SISWA REMEDIAL (NILAI AKHIR < 70) - ${title}`);
    console.log('='.repeat(150));
    console.log(` ${'No'.padEnd(5)} | ${'NISN'.padEnd(15)} | ${'Nama Siswa'.padEnd(25)} | ${'Kelas'.padEnd(12)} | ${'Mata Pelajaran'.padEnd(22)} | ${'Nilai Akhir'.padEnd(10)} | Teori | Praktek | Sikap | Hadir`);
    console.log('='.repeat(150));
    
    let no = 1;
    for (const item of data) {
        const namaDisplay = item.nama.length > 23 ? item.nama.substring(0, 20) + '...' : item.nama;
        const mapelDisplay = item.mapel.length > 20 ? item.mapel.substring(0, 17) + '...' : item.mapel;
        
        console.log(` ${String(no).padEnd(5)} | ${item.nisn.padEnd(15)} | ${namaDisplay.padEnd(25)} | ${item.kelas.padEnd(12)} | ${mapelDisplay.padEnd(22)} | ${String(item.nilaiAkhir).padStart(10)} | ${String(item.teori).padStart(5)} | ${String(item.praktek).padStart(6)} | ${String(item.sikap).padStart(5)} | ${String(item.kehadiran).padStart(5)}`);
        no++;
    }
    console.log('='.repeat(150));
}

// Helper untuk ambil data siswa
async function getDataSiswa(nisn) {
    const { getDataSiswa: getData } = require('./database.js');
    return await getData(nisn);
}

module.exports = { getRemedialSiswa };
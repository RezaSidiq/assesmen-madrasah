// modules/get-siswa.js - Menampilkan semua nilai satu siswa (OPTIMASI)

const { getDataSiswa, getDB } = require('./database.js');
const { validateNISNForUpdate, displayErrors } = require('./validator.js');
const { hitungNilaiAkhir, formatKelas } = require('./utils.js');

async function getNilaiSiswa(nisn) {
    console.log(`\n🔍 MENCARI DATA SISWA: ${nisn}\n`);
    
    // Validasi NISN
    const nisnValidation = await validateNISNForUpdate(nisn);
    if (!nisnValidation.valid) {
        displayErrors(nisnValidation.errors);
        return null;
    }
    
    const dataSiswa = await getDataSiswa(nisn);
    if (!dataSiswa) {
        console.log(`❌ ERROR: NISN "${nisn}" tidak ditemukan di database!`);
        return null;
    }
    
    const kelasFormatted = formatKelas(dataSiswa.kelas || '-');
    
    console.log('='.repeat(80));
    console.log('📋 DATA SISWA');
    console.log('='.repeat(80));
    console.log(`NISN         : ${nisn}`);
    console.log(`Nama         : ${dataSiswa.nama || '-'}`);
    console.log(`Kelas        : ${kelasFormatted}`);
    console.log(`Jenis Kelamin: ${dataSiswa.jk || '-'}`);
    console.log(`TTL          : ${dataSiswa.ttl || '-'}`);
    
    // Ambil semua nilai dari 4 node sekaligus (lebih efisien)
    const { getDB } = require('./database.js');
    const db = getDB();
    
    const [teoriSnapshot, praktekSnapshot, sikapSnapshot, kehadiranSnapshot] = await Promise.all([
        db.ref(`nilai/${nisn}`).once('value'),
        db.ref(`nilai_praktek/${nisn}`).once('value'),
        db.ref(`nilai_sikap/${nisn}`).once('value'),
        db.ref(`kehadiran/${nisn}`).once('value')
    ]);
    
    const nilaiTeori = teoriSnapshot.exists() ? teoriSnapshot.val() : {};
    const nilaiPraktek = praktekSnapshot.exists() ? praktekSnapshot.val() : {};
    const nilaiSikap = sikapSnapshot.exists() ? sikapSnapshot.val() : {};
    const nilaiKehadiran = kehadiranSnapshot.exists() ? kehadiranSnapshot.val() : {};
    
    // Kumpulkan semua mapel yang ada (dari 4 node)
    const semuaMapel = new Set();
    Object.keys(nilaiTeori).forEach(m => semuaMapel.add(m));
    Object.keys(nilaiPraktek).forEach(m => semuaMapel.add(m));
    Object.keys(nilaiSikap).forEach(m => semuaMapel.add(m));
    Object.keys(nilaiKehadiran).forEach(m => semuaMapel.add(m));
    
    const mapelList = Array.from(semuaMapel).sort();
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 NILAI SISWA');
    console.log('='.repeat(80));
    console.log(`\n ${'Mata Pelajaran'.padEnd(22)} │ Teori │ Praktek │ Sikap │ Hadir │ Nilai Akhir`);
    console.log('-'.repeat(80));
    
    let totalNilaiAkhir = 0;
    let jumlahMapel = 0;
    
    for (const mapel of mapelList) {
        const teori = nilaiTeori[mapel] !== undefined ? nilaiTeori[mapel] : '-';
        const praktek = nilaiPraktek[mapel] !== undefined ? nilaiPraktek[mapel] : '-';
        const sikap = nilaiSikap[mapel] !== undefined ? nilaiSikap[mapel] : '-';
        const hadir = nilaiKehadiran[mapel] !== undefined ? nilaiKehadiran[mapel] : '-';
        
        let nilaiAkhir = '-';
        if (teori !== '-' && praktek !== '-' && hadir !== '-') {
            nilaiAkhir = hitungNilaiAkhir(teori, praktek, sikap, hadir).toFixed(2);
            totalNilaiAkhir += parseFloat(nilaiAkhir);
            jumlahMapel++;
        }
        
        const teoriStr = String(teori).padStart(5);
        const praktekStr = String(praktek).padStart(6);
        const sikapStr = String(sikap).padStart(5);
        const hadirStr = String(hadir).padStart(5);
        const nilaiStr = String(nilaiAkhir).padStart(11);
        
        console.log(` ${mapel.padEnd(22)} │ ${teoriStr} │ ${praktekStr} │ ${sikapStr} │ ${hadirStr} │ ${nilaiStr}`);
    }
    
    const rataKeseluruhan = jumlahMapel > 0 ? (totalNilaiAkhir / jumlahMapel).toFixed(2) : 0;
    
    console.log('\n' + '='.repeat(80));
    console.log('📈 RINGKASAN');
    console.log('='.repeat(80));
    console.log(`Jumlah Mapel         : ${jumlahMapel}`);
    console.log(`Rata-rata Nilai Akhir: ${rataKeseluruhan}`);
    console.log(`Status               : ${rataKeseluruhan >= 70 ? '✅ LULUS' : '⚠️  REMEDIAL'}`);
    console.log('='.repeat(80));
    
    return dataSiswa;
}

module.exports = { getNilaiSiswa };

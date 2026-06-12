// modules/list.js - Menampilkan daftar NISN, mapel, dan kelas

const { getAllSiswa, getAllMapel } = require('./database.js');

async function listAllNISN() {
    console.log('\n📋 DAFTAR SEMUA NISN DI DATABASE\n');
    
    const siswa = await getAllSiswa();
    const siswaList = [];
    
    for (const nisn in siswa) {
        siswaList.push({
            nisn: nisn,
            nama: siswa[nisn].nama || '-',
            kelas: siswa[nisn].kelas || '-'
        });
    }
    
    if (siswaList.length === 0) {
        console.log('❌ Tidak ada data siswa di database!');
        return;
    }
    
    // Urutkan berdasarkan kelas, kemudian nama
    siswaList.sort((a, b) => {
        if (a.kelas !== b.kelas) return a.kelas.localeCompare(b.kelas);
        return a.nama.localeCompare(b.nama);
    });
    
    console.log(`📊 Total: ${siswaList.length} siswa\n`);
    console.log('='.repeat(75));
    console.log(` ${'NISN'.padEnd(15)} | ${'Nama Siswa'.padEnd(30)} | Kelas`);
    console.log('='.repeat(75));
    
    for (const siswa of siswaList) {
        console.log(` ${siswa.nisn.padEnd(14)} | ${siswa.nama.padEnd(30)} | ${siswa.kelas}`);
    }
    console.log('='.repeat(75));
}

async function listAllMapel() {
    console.log('\n📚 DAFTAR MATA PELAJARAN DI DATABASE\n');
    
    const mapelList = await getAllMapel();
    
    if (mapelList.length === 0) {
        console.log('❌ Tidak ada data mata pelajaran di database!');
        return;
    }
    
    console.log(`📊 Total: ${mapelList.length} mata pelajaran\n`);
    console.log('='.repeat(40));
    console.log(` ${'No'.padEnd(5)} | Mata Pelajaran`);
    console.log('='.repeat(40));
    
    mapelList.forEach((mapel, index) => {
        console.log(` ${String(index + 1).padEnd(5)} | ${mapel}`);
    });
    console.log('='.repeat(40));
    
    console.log('\n💡 Gunakan nama mapel ini untuk parameter --mapel pada perintah lain');
}

async function listKelas() {
    console.log('\n📋 DAFTAR SEMUA KELAS DI DATABASE\n');
    
    const siswa = await getAllSiswa();
    const kelasSet = new Set();
    
    for (let nisn in siswa) {
        const kelas = siswa[nisn].kelas;
        if (kelas) kelasSet.add(kelas);
    }
    
    const kelasList = Array.from(kelasSet).sort();
    
    if (kelasList.length === 0) {
        console.log('❌ Tidak ada data kelas di database!');
        return;
    }
    
    console.log(`📊 Total: ${kelasList.length} kelas\n`);
    console.log('='.repeat(30));
    console.log(` Kelas`);
    console.log('='.repeat(30));
    
    for (const kelas of kelasList) {
        console.log(` ${kelas}`);
    }
    console.log('='.repeat(30));
    
    console.log('\n💡 Gunakan angka kelas ini untuk parameter --kelas pada perintah lain');
}

module.exports = { listAllNISN, listAllMapel, listKelas };
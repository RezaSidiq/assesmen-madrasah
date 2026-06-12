// modules/update-single.js - Update satu nilai siswa

const { updateNilai } = require('./database.js');
const { validateNISNForUpdate, validateNilai, validateMapelForSiswa, validateTipe, displayErrors } = require('./validator.js');
const { getDataSiswa } = require('./database.js');
const { formatKelas } = require('./utils.js');

function getTargetNodeAndDisplay(tipeNilai) {
    switch (tipeNilai) {
        case 'teori': return { targetNode: 'nilai', display: 'TEORI' };
        case 'praktek': return { targetNode: 'nilai_praktek', display: 'PRAKTEK' };
        case 'sikap': return { targetNode: 'nilai_sikap', display: 'SIKAP' };
        case 'kehadiran': return { targetNode: 'kehadiran', display: 'KEHADIRAN' };
        default: return { targetNode: 'nilai', display: 'TEORI' };
    }
}

async function updateSingleNilai(nisn, mapel, nilaiInput, tipeNilai = 'teori') {
    console.log(`\n🔍 UPDATE SINGLE NILAI\n`);
    
    // Validasi NISN
    const nisnValidation = await validateNISNForUpdate(nisn);
    if (!nisnValidation.valid) {
        displayErrors(nisnValidation.errors);
        console.log(`\n💡 Gunakan 'node updateNilai.js --list-nisn' untuk melihat daftar NISN.`);
        return false;
    }
    
    // Validasi nilai
    const nilaiValidation = validateNilai(nilaiInput);
    if (!nilaiValidation.valid) {
        displayErrors(nilaiValidation.errors);
        return false;
    }
    const nilai = nilaiValidation.nilaiAngka;
    
    // Validasi mapel untuk siswa ini
    const mapelValidation = await validateMapelForSiswa(nisn, mapel);
    if (!mapelValidation.valid) {
        displayErrors(mapelValidation.errors);
        console.log(`\n💡 Gunakan 'node updateNilai.js --get ${nisn}' untuk melihat mapel yang tersedia.`);
        return false;
    }
    
    // Validasi tipe
    const tipeValidation = validateTipe(tipeNilai);
    if (!tipeValidation.valid) {
        displayErrors(tipeValidation.errors);
        return false;
    }
    
    const { targetNode, display } = getTargetNodeAndDisplay(tipeValidation.tipe);
    
    // Ambil data siswa untuk ditampilkan
    const dataSiswa = await getDataSiswa(nisn);
    const kelasFormatted = formatKelas(dataSiswa?.kelas || '-');
    
    console.log(`   👤 Nama      : ${dataSiswa?.nama || '-'}`);
    console.log(`   🏫 Kelas     : ${kelasFormatted}`);
    console.log(`   📚 Mapel     : ${mapel}`);
    console.log(`   📝 Jenis     : ${display}`);
    console.log(`   🎯 Nilai     : ${nilai}`);
    console.log(`   📍 Target    : ${targetNode}/${nisn}/${mapel}\n`);
    
    try {
        await updateNilai(nisn, mapel, nilai, targetNode);
        console.log(`✅ BERHASIL: ${nisn} - ${mapel} = ${nilai} (${display})`);
        return true;
    } catch (error) {
        console.log(`❌ GAGAL: ${nisn} - ${mapel} = ${error.message}`);
        return false;
    }
}

module.exports = { updateSingleNilai };
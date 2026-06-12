// updateNilai.js - Entry point utama (DENGAN SEMUA FITUR)

const { initFirebase } = require('./modules/database.js');
const { showHelp } = require('./modules/help.js');
const { updateFromCSV } = require('./modules/update-csv.js');
const { updateSingleNilai } = require('./modules/update-single.js');
const { getNilaiSiswa } = require('./modules/get-siswa.js');
const { getNilaiByMapel } = require('./modules/get-mapel.js');
const { getRemedialSiswa } = require('./modules/remedial.js');
const { generateLaporan } = require('./modules/laporan.js');
const { listAllNISN, listAllMapel, listKelas } = require('./modules/list.js');
const { 
    tambahSiswa, 
    updateSiswaData, 
    hapusSiswa,
    importSiswaFromCSV,
    updateSiswaBatchFromCSV,
    hapusSiswaBatchFromCSV,
    naikkanKelas
} = require('./modules/siswa.js');
const { validateTipe, displayErrors } = require('./modules/validator.js');
const { backupToJSON, backupToSQLite, restoreFromJSON } = require('./modules/backup.js');
// ============ HELPER FUNCTIONS ============

function getTipe(args) {
    const tipeIndex = args.indexOf('--tipe');
    if (tipeIndex !== -1 && args[tipeIndex + 1]) {
        const tipeValidation = validateTipe(args[tipeIndex + 1]);
        if (!tipeValidation.valid) {
            displayErrors(tipeValidation.errors);
            process.exit(1);
        }
        return tipeValidation.tipe;
    }
    return 'teori';
}

function getKelas(args) {
    const kelasIndex = args.indexOf('--kelas');
    if (kelasIndex !== -1 && args[kelasIndex + 1]) {
        return args[kelasIndex + 1];
    }
    return null;
}

function getMapel(args) {
    const mapelIndex = args.indexOf('--mapel');
    if (mapelIndex !== -1 && args[mapelIndex + 1]) {
        return args[mapelIndex + 1];
    }
    return null;
}

function getBy(args) {
    const byIndex = args.indexOf('--by');
    if (byIndex !== -1 && args[byIndex + 1]) {
        const byValue = args[byIndex + 1].toLowerCase();
        if (byValue === 'kelas' || byValue === 'mapel') {
            return byValue;
        }
        console.log(`❌ --by hanya menerima nilai 'kelas' atau 'mapel'`);
        process.exit(1);
    }
    return null;
}

function getNisn(args) {
    const nisnIndex = args.indexOf('--nisn');
    if (nisnIndex !== -1 && args[nisnIndex + 1]) {
        return args[nisnIndex + 1];
    }
    return null;
}

function getNama(args) {
    const namaIndex = args.indexOf('--nama');
    if (namaIndex !== -1 && args[namaIndex + 1]) {
        return args[namaIndex + 1];
    }
    return null;
}

function getJk(args) {
    const jkIndex = args.indexOf('--jk');
    if (jkIndex !== -1 && args[jkIndex + 1]) {
        return args[jkIndex + 1];
    }
    return null;
}

function getTtl(args) {
    const ttlIndex = args.indexOf('--ttl');
    if (ttlIndex !== -1 && args[ttlIndex + 1]) {
        return args[ttlIndex + 1];
    }
    return null;
}

function getDariKelas(args) {
    const dariIndex = args.indexOf('--dari');
    if (dariIndex !== -1 && args[dariIndex + 1]) {
        return args[dariIndex + 1];
    }
    return null;
}

function getKeKelas(args) {
    const keIndex = args.indexOf('--ke');
    if (keIndex !== -1 && args[keIndex + 1]) {
        return args[keIndex + 1];
    }
    return null;
}

function getFile(args) {
    const fileIndex = args.indexOf('--file');
    if (fileIndex !== -1 && args[fileIndex + 1]) {
        return args[fileIndex + 1];
    }
    return null;
}

// Helper untuk mengambil parameter --output
function getOutput(args) {
    const outputIndex = args.indexOf('--output');
    if (outputIndex !== -1 && args[outputIndex + 1]) {
        return args[outputIndex + 1];
    }
    return null;
}

// ============ MAIN ============

async function main() {
    const args = process.argv.slice(2);
    const startTime = Date.now();
    
    // Help tanpa Firebase
    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        showHelp();
        process.exit(0);
    }
    
    // Inisialisasi Firebase untuk perintah lain
    try {
        initFirebase();
    } catch (error) {
        console.error(`\n❌ Gagal menginisialisasi Firebase: ${error.message}`);
        process.exit(1);
    }
    
    try {
        switch (args[0]) {
            // ============ UPDATE NILAI (EXISTING) ============
            case '--file':
                if (!args[1]) {
                    console.log('❌ --file membutuhkan parameter nama file');
                    process.exit(1);
                }
                await updateFromCSV(args[1], getTipe(args));
                break;
                
            case '--single':
                if (!args[1] || !args[2] || !args[3]) {
                    console.log('❌ Format: --single <nisn> <mapel> <nilai> --tipe <tipe>');
                    process.exit(1);
                }
                await updateSingleNilai(args[1], args[2], args[3], getTipe(args));
                break;
                
            // ============ LIHAT DATA (EXISTING) ============
            case '--get':
                if (!args[1]) {
                    console.log('❌ --get membutuhkan parameter NISN');
                    process.exit(1);
                }
                await getNilaiSiswa(args[1]);
                break;
                
            case '--get-mapel':
                if (!args[1]) {
                    console.log('❌ --get-mapel membutuhkan parameter mapel');
                    process.exit(1);
                }
                await getNilaiByMapel(args[1], getKelas(args));
                break;
                
            // ============ LAPORAN (EXISTING) ============
            case '--laporan':
                if (!args[1]) {
                    console.log('❌ --laporan membutuhkan parameter mapel');
                    process.exit(1);
                }
                await generateLaporan(args[1], getKelas(args));
                break;
                
            // ============ REMEDIAL (EXISTING - SUDAH TABEL) ============
            case '--remedial':
                let remedialFilterType = null;
                let remedialFilterValue = null;
                let remedialExport = false;
                
                // Cek apakah ada --export
                if (args.includes('--export')) {
                    remedialExport = true;
                    console.log(`   📁 Export CSV: YES`);
                }
                
                // Cek --by-kelas
                const byKelasIndex = args.indexOf('--by-kelas');
                if (byKelasIndex !== -1 && args[byKelasIndex + 1]) {
                    remedialFilterType = 'kelas';
                    remedialFilterValue = args[byKelasIndex + 1];
                    console.log(`   Filter by: KELAS (${remedialFilterValue})`);
                }
                // Cek --by-mapel
                else {
                    const byMapelIndex = args.indexOf('--by-mapel');
                    if (byMapelIndex !== -1 && args[byMapelIndex + 1]) {
                        remedialFilterType = 'mapel';
                        remedialFilterValue = args[byMapelIndex + 1];
                        console.log(`   Filter by: MAPEL (${remedialFilterValue})`);
                    }
                    // Cek --by-nisn
                    else {
                        const byNisnIndex = args.indexOf('--by-nisn');
                        if (byNisnIndex !== -1 && args[byNisnIndex + 1]) {
                            remedialFilterType = 'nisn';
                            remedialFilterValue = args[byNisnIndex + 1];
                            console.log(`   Filter by: NISN (${remedialFilterValue})`);
                        }
                        else {
                            console.log(`   Filter: SEMUA SISWA`);
                        }
                    }
                }
                
                console.log('');
                
                // Panggil fungsi
                if (remedialFilterType === 'kelas') {
                    await getRemedialSiswa(remedialFilterValue, null, null, 'kelas', remedialExport);
                } else if (remedialFilterType === 'mapel') {
                    await getRemedialSiswa(null, remedialFilterValue, null, 'mapel', remedialExport);
                } else if (remedialFilterType === 'nisn') {
                    await getRemedialSiswa(null, null, remedialFilterValue, 'nisn', remedialExport);
                } else {
                    await getRemedialSiswa(null, null, null, null, remedialExport);
                }
                break;
                
            // ============ LIST (EXISTING) ============
            case '--list-nisn':
                await listAllNISN();
                break;
                
            case '--list-mapel':
                await listAllMapel();
                break;
                
            case '--list-kelas':
                await listKelas();
                break;
                
            // ============ FITUR BARU: MANAJEMEN SISWA ============
            
            // Tambah satu siswa
            case '--tambah-siswa':
                const nisn = getNisn(args);
                const nama = getNama(args);
                const kelas = getKelas(args);
                const jk = getJk(args);
                const ttl = getTtl(args);
                
                if (!nisn || !nama || !kelas) {
                    console.log('❌ --tambah-siswa membutuhkan --nisn, --nama, --kelas');
                    console.log('   Contoh: --tambah-siswa --nisn 1234567890 --nama "Ahmad" --kelas "VII (Tujuh)" --jk "L" --ttl "Jakarta, 1 Jan 2010"');
                    process.exit(1);
                }
                await tambahSiswa(nisn, nama, kelas, jk, ttl);
                break;
                
            // Update satu siswa
            case '--update-siswa':
                const updateNisn = getNisn(args);
                const updateNama = getNama(args);
                const updateKelas = getKelas(args);
                const updateJk = getJk(args);
                const updateTtl = getTtl(args);
                
                if (!updateNisn) {
                    console.log('❌ --update-siswa membutuhkan --nisn');
                    console.log('   Contoh: --update-siswa --nisn 1234567890 --nama "Ahmad Fauzi" --kelas "VIII (Delapan)"');
                    process.exit(1);
                }
                await updateSiswaData(updateNisn, {
                    nama: updateNama,
                    kelas: updateKelas,
                    jk: updateJk,
                    ttl: updateTtl
                });
                break;
                
            // Hapus satu siswa
            case '--hapus-siswa':
                const hapusNisn = getNisn(args);
                if (!hapusNisn) {
                    console.log('❌ --hapus-siswa membutuhkan --nisn');
                    console.log('   Contoh: --hapus-siswa --nisn 1234567890');
                    process.exit(1);
                }
                await hapusSiswa(hapusNisn);
                break;
                
            // Import siswa dari CSV
            case '--import-siswa':
                const importFile = getFile(args);
                if (!importFile) {
                    console.log('❌ --import-siswa membutuhkan --file');
                    console.log('   Contoh: --import-siswa --file siswa.csv');
                    process.exit(1);
                }
                await importSiswaFromCSV(importFile);
                break;
                
            // Update batch siswa dari CSV
            case '--update-siswa-batch':
                const updateBatchFile = getFile(args);
                if (!updateBatchFile) {
                    console.log('❌ --update-siswa-batch membutuhkan --file');
                    console.log('   Contoh: --update-siswa-batch --file update.csv');
                    process.exit(1);
                }
                await updateSiswaBatchFromCSV(updateBatchFile);
                break;
                
            // Hapus batch siswa dari CSV
            case '--hapus-siswa-batch':
                const hapusBatchFile = getFile(args);
                if (!hapusBatchFile) {
                    console.log('❌ --hapus-siswa-batch membutuhkan --file');
                    console.log('   Contoh: --hapus-siswa-batch --file hapus.csv');
                    process.exit(1);
                }
                await hapusSiswaBatchFromCSV(hapusBatchFile);
                break;
                
            // Naikkan kelas
            case '--naik-kelas':
                const dariKelas = getDariKelas(args);
                const keKelas = getKeKelas(args);
                if (!dariKelas || !keKelas) {
                    console.log('❌ --naik-kelas membutuhkan --dari dan --ke');
                    console.log('   Contoh: --naik-kelas --dari "VII (Tujuh)" --ke "VIII (Delapan)"');
                    process.exit(1);
                }
                await naikkanKelas(dariKelas, keKelas);
                break;
                
            default:
                console.log(`❌ Perintah "${args[0]}" tidak dikenal.`);
                console.log('Gunakan: node updateNilai.js --help untuk bantuan');
                break;
            // ============ BACKUP & RESTORE ============

            case '--backup':
                const backupFormat = args[1] ? args[1].toLowerCase() : 'json';
                const backupOutput = getOutput(args);
                
                if (backupFormat === 'json') {
                    await backupToJSON(backupOutput);
                } else if (backupFormat === 'sqlite') {
                    await backupToSQLite(backupOutput);
                } else {
                    console.log(`❌ Format backup tidak dikenal. Gunakan 'json' atau 'sqlite'`);
                    console.log(`   Contoh: node updateNilai.js --backup json`);
                    console.log(`   Contoh: node updateNilai.js --backup sqlite`);
                }
                break;

            case '--restore':
                const restoreFile = getFile(args);
                if (!restoreFile) {
                    console.log('❌ --restore membutuhkan --file');
                    console.log('   Contoh: node updateNilai.js --restore --file backup.json');
                    process.exit(1);
                }
                await restoreFromJSON(restoreFile);
                break;
        }
    } catch (error) {
        console.error(`\n❌ ERROR TAK TERDUGA: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
    
    const endTime = Date.now();
    console.log(`\n⏱️  Waktu eksekusi: ${((endTime - startTime) / 1000).toFixed(2)} detik`);
    process.exit(0);
}

main();
// modules/update-csv.js - Update nilai dari file CSV

const fs = require('fs');
const csv = require('csv-parser');
const { delay } = require('./utils.js');
const { batchUpdate, getDataSiswa, getAllNISN } = require('./database.js');
const { 
	validateNISN, 
	validateNilai, 
	validateMapel, 
	displayErrors, 
	validateCSVFile
 } = require('./validator.js');

// Mendapatkan target node berdasarkan tipe
function getTargetNode(tipeNilai) {
    switch (tipeNilai) {
        case 'teori': return 'nilai';
        case 'praktek': return 'nilai_praktek';
        case 'sikap': return 'nilai_sikap';
        case 'kehadiran': return 'kehadiran';
        default: return 'nilai';
    }
}

function getTipeDisplay(tipeNilai) {
    switch (tipeNilai) {
        case 'teori': return 'TEORI';
        case 'praktek': return 'PRAKTEK';
        case 'sikap': return 'SIKAP';
        case 'kehadiran': return 'KEHADIRAN';
        default: return 'TEORI';
    }
}

// Baca dan parsing file CSV
function readCSVFile(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        let invalidCount = 0;
        
        fs.createReadStream(filePath)
            .pipe(csv({ separator: ';' }))
            .on('data', (data) => {
                const nisn = data.nisn || data.NISN;
                const mapel = data.mapel || data.MAPEL;
                const nilai = data.nilai || data.NILAI;
                
                if (nisn && mapel && nilai !== undefined && nilai !== '') {
                    const nilaiAngka = parseFloat(String(nilai).replace(',', '.'));
                    if (!isNaN(nilaiAngka) && nilaiAngka >= 0 && nilaiAngka <= 100) {
                        results.push({
                            nisn: String(nisn).trim(),
                            mapel: String(mapel).trim(),
                            nilai: nilaiAngka
                        });
                    } else {
                        console.log(`⚠️  Nilai tidak valid: ${nisn} - ${mapel} = ${nilai}`);
                        invalidCount++;
                    }
                } else {
                    invalidCount++;
                }
            })
            .on('end', () => resolve({ results, invalidCount }))
            .on('error', reject);
    });
}

// Verifikasi data CSV (validasi NISN)
async function verifyCSVData(results) {
    const validData = [];
    const invalidNISN = [];
    const existingNISN = await getAllNISN();
    
    console.log(`📋 Daftar NISN valid di database: ${existingNISN.length} siswa\n`);
    
    for (const item of results) {
        const nisnValid = existingNISN.includes(item.nisn);
        
        if (!nisnValid) {
            invalidNISN.push({ nisn: item.nisn, mapel: item.mapel });
            continue;
        }
        
        const dataSiswa = await getDataSiswa(item.nisn);
        validData.push({
            ...item,
            nama: dataSiswa?.nama || '-',
            kelas: dataSiswa?.kelas || '-'
        });
    }
    
    // Tampilkan NISN yang tidak ditemukan
    if (invalidNISN.length > 0) {
        console.log(`\n⚠️  NISN tidak ditemukan (${invalidNISN.length} baris):`);
        invalidNISN.slice(0, 10).forEach(item => {
            console.log(`   - ${item.nisn} (${item.mapel})`);
        });
        if (invalidNISN.length > 10) {
            console.log(`   ... dan ${invalidNISN.length - 10} lainnya`);
        }
    }
    
    return { validData, invalidCount: invalidNISN.length };
}

// Batch update per siswa
async function batchUpdatePerSiswa(validData, targetNode, tipeDisplay) {
    // Kelompokkan berdasarkan NISN
    const groupedByNisn = {};
    for (const item of validData) {
        if (!groupedByNisn[item.nisn]) {
            groupedByNisn[item.nisn] = {
                nama: item.nama,
                kelas: item.kelas,
                mapel: {}
            };
        }
        groupedByNisn[item.nisn].mapel[item.mapel] = item.nilai;
    }
    
    console.log(`\n🔄 Memulai update ke Firebase (${tipeDisplay})...`);
    console.log(`📦 Update untuk ${Object.keys(groupedByNisn).length} siswa\n`);
    console.log('='.repeat(80));
    
    let successCount = 0;
    let errorCount = 0;
    let processed = 0;
    const totalNisn = Object.keys(groupedByNisn).length;
    
    for (const [nisn, data] of Object.entries(groupedByNisn)) {
        const percent = Math.round((processed / totalNisn) * 100);
        
        try {
            const updates = {};
            for (const [mapel, nilai] of Object.entries(data.mapel)) {
                updates[`${targetNode}/${nisn}/${mapel}`] = nilai;
            }
            
            await batchUpdate(updates);
            
            const mapelCount = Object.keys(data.mapel).length;
            successCount += mapelCount;
            processed++;
            
            console.log(`✅ [${processed}/${totalNisn}] (${percent}%)`);
            console.log(`   📌 NISN      : ${nisn}`);
            console.log(`   👤 Nama      : ${data.nama}`);
            console.log(`   🏫 Kelas     : ${data.kelas}`);
            console.log(`   📊 Jumlah    : ${mapelCount} mapel`);
            console.log(`   📝 Jenis     : ${tipeDisplay}`);
            console.log('');
            
            await delay(50);
            
        } catch (error) {
            console.log(`❌ [${processed + 1}/${totalNisn}] GAGAL: ${nisn}`);
            console.log(`   Error: ${error.message}\n`);
            errorCount += Object.keys(data.mapel).length;
            processed++;
        }
    }
    
    console.log('='.repeat(80));
    console.log(`📋 RINGKASAN UPDATE ${tipeDisplay}`);
    console.log('='.repeat(80));
    console.log(`✅ Berhasil update    : ${successCount} nilai`);
    console.log(`❌ Gagal update      : ${errorCount} nilai`);
    console.log(`👨‍🎓 Total siswa      : ${totalNisn} orang`);
    console.log('='.repeat(80));
    
    return { successCount, errorCount };
}

// Main function: update dari CSV
async function updateFromCSV(filePath, tipeNilai = 'teori') {
    console.log(`\n📂 MEMBACA FILE CSV...`);
    
    // Validasi file
    const fileValidation = validateCSVFile(filePath);
    if (!fileValidation.valid) {
        displayErrors(fileValidation.errors);
        return;
    }
    
    const targetNode = getTargetNode(tipeNilai);
    const tipeDisplay = getTipeDisplay(tipeNilai);
    
    console.log(`   Target node: ${targetNode} (${tipeDisplay})`);
    
    // Baca CSV
    const { results, invalidCount: csvInvalidCount } = await readCSVFile(filePath);
    console.log(`\n📊 Total data dari CSV: ${results.length} baris`);
    if (csvInvalidCount > 0) {
        console.log(`⚠️  Data tidak valid: ${csvInvalidCount} baris`);
    }
    
    if (results.length === 0) {
        console.log('❌ Tidak ada data valid dari CSV!');
        return;
    }
    
    // Verifikasi data
    const { validData, invalidCount } = await verifyCSVData(results);
    
    console.log(`\n📊 Hasil Verifikasi:`);
    console.log(`   ✅ Data valid: ${validData.length}`);
    console.log(`   ❌ Data invalid: ${invalidCount}`);
    
    if (validData.length === 0) {
        console.log('\n❌ Tidak ada data valid untuk diupdate!');
        return;
    }
    
    // Update batch
    await batchUpdatePerSiswa(validData, targetNode, tipeDisplay);
}

module.exports = { updateFromCSV };

const fs = require('fs');
const path = require('path');

const libPath = path.join(__dirname, '..', 'public', 'voice_library');

if (!fs.existsSync(libPath)) {
    fs.mkdirSync(libPath, { recursive: true });
}

// Giả sử lấy file này làm mẫu gốc (placeholder) để nhân bản
const sourceWav = path.join(__dirname, '..', 'public', 'audio', 'test.wav'); 

// Tạo tệp giả lập nếu sourceWav không tồn tại (để tránh lỗi)
if (!fs.existsSync(sourceWav)) {
    // Nếu không có, tạo một tệp wav hợp lệ nhưng rỗng (ở đây chỉ là tệp text để mô phỏng, thực tế sẽ là wav hợp lệ)
    // Tạm thời tạo tệp trắng, nhưng VieNeu sẽ lỗi nếu ref_audio không phải wav chuẩn.
    // Giả sử lúc trước VieNeu đã tạo được file test.wav thành công, file đó sẽ tồn tại.
}

const genders = ['male', 'female'];
const ages = ['child', 'youth', 'elder'];
const regions = ['north', 'central', 'south', 'west'];

let count = 0;

for (let g of genders) {
    for (let a of ages) {
        for (let r of regions) {
            const filename = `${g}_${a}_${r}.wav`;
            const destPath = path.join(libPath, filename);
            
            if (fs.existsSync(sourceWav)) {
                fs.copyFileSync(sourceWav, destPath);
            } else {
                fs.writeFileSync(destPath, "dummy wav content");
            }
            count++;
        }
    }
}

console.log(`Đã tạo thành công ${count} file giọng mẫu giả lập trong ${libPath}`);

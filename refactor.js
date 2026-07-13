const fs = require('fs');
let content = fs.readFileSync('src/app/couple-fashion/page.js', 'utf8');

// 1. STATE REPLACEMENTS
content = content.replace('const [personImage, setPersonImage] = useState(null);', 
  'const [person1Image, setPerson1Image] = useState(null);\n  const [person2Image, setPerson2Image] = useState(null);');
content = content.replace('const [garmentImage, setGarmentImage] = useState(null);', 
  'const [garment1Image, setGarment1Image] = useState(null);\n  const [garment2Image, setGarment2Image] = useState(null);');
content = content.replace('const [productImage, setProductImage] = useState(null);\n', '');

content = content.replace('const [productInteraction, setProductInteraction] = useState("");', 
  'const [interaction, setInteraction] = useState("");');

content = content.replace('const [gender, setGender] = useState("female");', 
  'const [gender1, setGender1] = useState("female");\n  const [gender2, setGender2] = useState("male");');
content = content.replace('const [age, setAge] = useState("25");', 
  'const [age1, setAge1] = useState("25");\n  const [age2, setAge2] = useState("28");');

content = content.replace('const personInputRef = useRef(null);', 
  'const p1Ref = useRef(null);\n  const p2Ref = useRef(null);');
content = content.replace('const garmentInputRef = useRef(null);', 
  'const g1Ref = useRef(null);\n  const g2Ref = useRef(null);');
content = content.replace('const productInputRef = useRef(null);\n', '');

// 2. LOGIC REPLACEMENTS
content = content.replace('if (!personImage) {\n      alert("Vui lòng tải lên ảnh của bạn!");', 
  'if (!person1Image || !person2Image) {\n      alert("Vui lòng tải lên ảnh của cả 2 người!");');

content = content.replace('formData.append("personImage", personImage);', 
  'formData.append("person1Image", person1Image);\n      formData.append("person2Image", person2Image);');
content = content.replace('if (garmentImage) formData.append("garmentImage", garmentImage);', 
  'if (garment1Image) formData.append("garment1Image", garment1Image);\n      if (garment2Image) formData.append("garment2Image", garment2Image);');
content = content.replace('if (productImage) formData.append("productImage", productImage);\n', '');
content = content.replace('if (productInteraction) formData.append("productInteraction", productInteraction);', 
  'if (interaction) formData.append("interaction", interaction);');
content = content.replace('formData.append("gender", gender);', 
  'formData.append("gender1", gender1);\n      formData.append("gender2", gender2);');
content = content.replace('formData.append("age", age);', 
  'formData.append("age1", age1);\n      formData.append("age2", age2);');

content = content.replace("'/api/analyze-fashion'", "'/api/analyze-couple'");
content = content.replace("'/api/generate-fashion'", "'/api/generate-couple'");

// 3. UI REPLACEMENTS
const oldUploadZones = `          {/* UPLOAD ZONES */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div className="input-group" style={{ flex: 1, minWidth: '120px' }}>
              <label className="label">1. Ảnh của bạn *</label>
              <div className="upload-area" style={{ padding: '1rem', minHeight: '120px' }} onClick={() => personInputRef.current.click()}>
                <input type="file" ref={personInputRef} onChange={(e) => handleFileChange(e, setPersonImage)} accept="image/*" style={{ display: 'none' }} />
                {personImage ? <img src={personImage} alt="Person" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px' }} /> : <span>Tải ảnh</span>}
              </div>
            </div>

            <div className="input-group" style={{ flex: 1, minWidth: '120px' }}>
              <label className="label">2. Trang phục</label>
              <div className="upload-area" style={{ padding: '1rem', minHeight: '120px', borderColor: garmentImage ? 'var(--accent)' : 'rgba(255,255,255,0.2)' }} onClick={() => garmentInputRef.current.click()}>
                <input type="file" ref={garmentInputRef} onChange={(e) => handleFileChange(e, setGarmentImage)} accept="image/*" style={{ display: 'none' }} />
                {garmentImage ? <img src={garmentImage} alt="Garment" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px' }} /> : <span>Tải ảnh</span>}
              </div>
            </div>

            <div className="input-group" style={{ flex: 1, minWidth: '100px' }}>
              <label className="label">3. Bối cảnh</label>
              <div className="upload-area" style={{ padding: '1rem', minHeight: '120px', borderColor: bgImage ? 'var(--accent)' : 'rgba(255,255,255,0.2)' }} onClick={() => bgInputRef.current.click()}>
                <input type="file" ref={bgInputRef} onChange={(e) => handleFileChange(e, setBgImage)} accept="image/*" style={{ display: 'none' }} />
                {bgImage ? <img src={bgImage} alt="Background" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px' }} /> : <span style={{fontSize: '0.8rem'}}>Tải ảnh</span>}
              </div>
            </div>

            <div className="input-group" style={{ flex: 1, minWidth: '100px' }}>
              <label className="label">4. Sản phẩm</label>
              <div className="upload-area" style={{ padding: '1rem', minHeight: '120px', borderColor: productImage ? 'var(--accent)' : 'rgba(255,255,255,0.2)' }} onClick={() => productInputRef.current.click()}>
                <input type="file" ref={productInputRef} onChange={(e) => handleFileChange(e, setProductImage)} accept="image/*" style={{ display: 'none' }} />
                {productImage ? <img src={productImage} alt="Product" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px' }} /> : <span style={{fontSize: '0.8rem'}}>Tải ảnh</span>}
              </div>
            </div>
          </div>`;

const newUploadZones = `          {/* UPLOAD ZONES - DUAL CHARACTER */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* COLUMN 1: PERSON 1 */}
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h4 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--primary)' }}>Nhân Vật 1 (Bên Trái)</h4>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="label">Giới tính / Tuổi</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select className="select" value={gender1} onChange={(e) => setGender1(e.target.value)} style={{flex: 1, padding: '0.5rem'}}>
                      <option value="female">Nữ</option>
                      <option value="male">Nam</option>
                    </select>
                    <input type="number" className="select" value={age1} onChange={(e) => setAge1(e.target.value)} style={{flex: 1, padding: '0.5rem'}} placeholder="25" />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="label">Khuôn mặt *</label>
                  <div className="upload-area" style={{ padding: '0.5rem', minHeight: '100px' }} onClick={() => p1Ref.current.click()}>
                    <input type="file" ref={p1Ref} onChange={(e) => handleFileChange(e, setPerson1Image)} accept="image/*" style={{ display: 'none' }} />
                    {person1Image ? <img src={person1Image} alt="P1" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px' }} /> : <span>Tải ảnh</span>}
                  </div>
                </div>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="label">Trang phục</label>
                  <div className="upload-area" style={{ padding: '0.5rem', minHeight: '100px', borderColor: garment1Image ? 'var(--accent)' : 'rgba(255,255,255,0.2)' }} onClick={() => g1Ref.current.click()}>
                    <input type="file" ref={g1Ref} onChange={(e) => handleFileChange(e, setGarment1Image)} accept="image/*" style={{ display: 'none' }} />
                    {garment1Image ? <img src={garment1Image} alt="G1" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px' }} /> : <span>Tải ảnh</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 2: PERSON 2 */}
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h4 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--primary)' }}>Nhân Vật 2 (Bên Phải)</h4>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="label">Giới tính / Tuổi</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select className="select" value={gender2} onChange={(e) => setGender2(e.target.value)} style={{flex: 1, padding: '0.5rem'}}>
                      <option value="female">Nữ</option>
                      <option value="male">Nam</option>
                    </select>
                    <input type="number" className="select" value={age2} onChange={(e) => setAge2(e.target.value)} style={{flex: 1, padding: '0.5rem'}} placeholder="28" />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="label">Khuôn mặt *</label>
                  <div className="upload-area" style={{ padding: '0.5rem', minHeight: '100px' }} onClick={() => p2Ref.current.click()}>
                    <input type="file" ref={p2Ref} onChange={(e) => handleFileChange(e, setPerson2Image)} accept="image/*" style={{ display: 'none' }} />
                    {person2Image ? <img src={person2Image} alt="P2" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px' }} /> : <span>Tải ảnh</span>}
                  </div>
                </div>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="label">Trang phục</label>
                  <div className="upload-area" style={{ padding: '0.5rem', minHeight: '100px', borderColor: garment2Image ? 'var(--accent)' : 'rgba(255,255,255,0.2)' }} onClick={() => g2Ref.current.click()}>
                    <input type="file" ref={g2Ref} onChange={(e) => handleFileChange(e, setGarment2Image)} accept="image/*" style={{ display: 'none' }} />
                    {garment2Image ? <img src={garment2Image} alt="G2" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px' }} /> : <span>Tải ảnh</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>`;

content = content.replace(oldUploadZones, newUploadZones);

const oldProductInteraction = `{/* PRODUCT INTERACTION OPTIONS */}
          {productImage && (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>Tùy chọn Tương tác Sản phẩm</h4>
              
              <div className="input-group">
                <label className="label">Hành động tương tác</label>
                <input type="text" className="select" value={productInteraction} onChange={(e) => setProductInteraction(e.target.value)} placeholder="VD: Đang cầm cốc cafe bằng tay phải..." />
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="label">Gợi ý hành động</label>
                <select className="select" value={productInteraction} onChange={(e) => setProductInteraction(e.target.value)}>
                  <option value="">-- Tự nhập --</option>
                  <option value="holding the product in right hand">Cầm bằng tay phải</option>
                  <option value="holding the product in left hand">Cầm bằng tay trái</option>
                  <option value="carrying the product over the shoulder">Đeo chéo vai (Túi xách)</option>
                  <option value="drinking from the product">Đang uống (Cốc/Chai)</option>
                </select>
              </div>
            </div>
          )}`;

const newProductInteraction = `{/* COMMON BACKGROUND AND INTERACTION */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>Cài Đặt Bối Cảnh & Tương Tác Cặp Đôi</h4>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="label">Ảnh Bối cảnh (Tùy chọn)</label>
                <div className="upload-area" style={{ padding: '0.5rem', minHeight: '60px', borderColor: bgImage ? 'var(--accent)' : 'rgba(255,255,255,0.2)' }} onClick={() => bgInputRef.current.click()}>
                  <input type="file" ref={bgInputRef} onChange={(e) => handleFileChange(e, setBgImage)} accept="image/*" style={{ display: 'none' }} />
                  {bgImage ? <span style={{color:'var(--accent)'}}>Đã tải ảnh nền</span> : <span style={{fontSize: '0.8rem'}}>Tải ảnh nền</span>}
                </div>
              </div>

              <div className="input-group" style={{ flex: 2 }}>
                <label className="label">Hoặc miêu tả cảnh (Text)</label>
                <input type="text" className="select" value={bgText} onChange={(e) => setBgText(e.target.value)} placeholder="VD: Đang đi dạo trên đường phố Paris..." disabled={!!bgImage} style={{ opacity: bgImage ? 0.5 : 1 }} />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="label">Hành động / Tương tác của 2 người</label>
              <input type="text" className="select" value={interaction} onChange={(e) => setInteraction(e.target.value)} placeholder="VD: Nắm tay nhau, đang cười đùa vui vẻ, tựa lưng vào nhau..." />
            </div>
          </div>`;

content = content.replace(oldProductInteraction, newProductInteraction);

// Remove the standalone bg options block since we moved it above
const oldBgOptions = `{/* BACKGROUND OPTIONS */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>Tùy chọn Bối cảnh (Nếu không tải ảnh)</h4>
            
            <div className="input-group">
              <label className="label">Ưu tiên 2: Nhập Text mô tả cảnh</label>
              <input type="text" className="select" value={bgText} onChange={(e) => setBgText(e.target.value)} placeholder="VD: Đang đi bộ qua đường phố Hà Nội..." disabled={!!bgImage} style={{ opacity: bgImage ? 0.5 : 1 }} />
            </div>

            <div className="input-group">
              <label className="label">Ưu tiên 3: Chọn danh sách gợi ý</label>
              <select className="select" value={bgPreset} onChange={(e) => setBgPreset(e.target.value)} disabled={!!bgImage || !!bgText} style={{ opacity: (bgImage || bgText) ? 0.5 : 1 }}>
                {BACKGROUND_PRESETS.map((bg, i) => <option key={i} value={bg}>{bg}</option>)}
              </select>
            </div>
          </div>`;
content = content.replace(oldBgOptions, '');

// Remove gender/age row
const oldGenderAgeRow = `<div style={{ display: 'flex', gap: '1rem' }}>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="label">Giới tính</label>
              <select className="select" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="female">Nữ</option>
                <option value="male">Nam</option>
              </select>
            </div>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="label">Tuổi</label>
              <input type="number" className="select" value={age} onChange={(e) => setAge(e.target.value)} placeholder="VD: 25" />
            </div>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="label">Số lượng</label>
              <select className="select" value={imageCount} onChange={(e) => setImageCount(Number(e.target.value))}>
                {[1, 2, 4, 6].map(num => <option key={num} value={num}>{num} ảnh</option>)}
              </select>
            </div>
          </div>`;
const newImageCountRow = `<div style={{ display: 'flex', gap: '1rem' }}>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="label">Số lượng ảnh (Mỗi batch)</label>
              <select className="select" value={imageCount} onChange={(e) => setImageCount(Number(e.target.value))}>
                {[1, 2, 4, 6].map(num => <option key={num} value={num}>{num} ảnh</option>)}
              </select>
            </div>
          </div>`;
content = content.replace(oldGenderAgeRow, newImageCountRow);

fs.writeFileSync('src/app/couple-fashion/page.js', content);

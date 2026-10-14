/* ─────────────────────────────────────────────
   PlantDoctor · app.js  |  Crop IQ | SIH 2025
   Hybrid AI · Auto Crop · Weather · Multilingual
───────────────────────────────────────────── */

let imageFile       = null;
let imageDataUrl    = null;
let loadingInterval = null;
let tfModel         = null;
let currentLang     = "en";
let detectedCrop    = "";
let lastResultData  = null;  // store last result for language re-render
let lastResultMode  = "";

const GEMINI_API_KEY = "AIzaSyCx_Po3fMlRhymtkHTm1h-h8N9rD1pVi4w";
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
const BACKEND_URL = "https://plantdoctor-backend-ojjr.onrender.com";

/* ══════════════════════════════════════════
   TRANSLATIONS
══════════════════════════════════════════ */
const T = {
  en: {
    subtitle:           "AI-POWERED CROP DISEASE DETECTION · CROP IQ",
    diagnoseTitle:      "Diagnose Your Crop 🔬",
    diagnoseSubtitle:   "Upload a clear photo of the affected leaf. AI will auto-detect the crop and disease instantly.",
    uploadGallery:      "📁 Upload from Gallery",
    uploadCamera:       "📷 Capture with Camera",
    imageReady:         "📸 Image ready for analysis",
    detectBtn:          "🔬 Detect Disease",
    analyzingTitle:     "Analyzing Leaf...",
    analyzingSubtitle:  "AI is detecting disease patterns and generating your treatment plan.",
    confidence:         "Detection Confidence",
    overview:           "Disease Overview",
    symptoms:           "Symptoms Identified",
    treatment:          "Treatment Steps",
    prevention:         "Prevention Tips",
    newScan:            "🔄 New Scan",
    copyReport:         "📋 Copy Report",
    reportCopied:       "✅ Report copied!",
    copyFailed:         "⚠️ Copy failed.",
    onlineMode:         "🌐 Online — AI",
    offlineMode:        "📴 Offline — Local AI",
    geminiFailed:       "⚠️ Switching to offline AI...",
    noModel:            "Offline model not available.",
    detectedBy:         "Detected by",
    detectingCrop:      "Identifying crop from photo...",
    cropDetectedLabel:  "Crop Detected:",
    cropNotFound:       "⚠️ Could not identify crop. Please upload a clear leaf photo.",
    retranslating:      "🔄 Translating results...",
    loadingMsgs: [
      "🔍 Scanning leaf structure...",
      "🧬 Analyzing disease patterns...",
      "📊 Calculating severity...",
      "💊 Preparing treatment plan...",
      "✅ Finalizing diagnosis..."
    ],
    cropDetectPrompt: `Look at this image. What crop leaf is shown?
Reply ONLY with JSON: {"crop": "Tomato"}
Choose from: Wheat, Paddy / Rice, Millets, Tomato, Corn / Maize, Cotton, Sugarcane, Brinjal / Eggplant, Chili / Pepper.
If unclear: {"crop": "unknown"}`,
    geminiPrompt: (crop) => `You are Dr. PlantDoctor, a senior plant pathologist with 25+ years of experience helping Indian farmers. You specialize in crop disease diagnosis and precision treatment.
Farmer uploaded a ${crop} leaf photo. Give expert diagnosis.
Use SIMPLE English — short sentences, easy words like explaining to a village farmer.
Reply ONLY with this JSON (no markdown, no backticks):
{
  "diseaseName": "exact disease name or 'Healthy Crop'",
  "severity": "High" or "Medium" or "Low" or "None",
  "confidence": <60-98>,
  "overview": "2-3 simple sentences about this disease from expert perspective",
  "symptoms": ["symptom 1","symptom 2","symptom 3","symptom 4"],
  "treatment": ["step 1 with exact action","step 2","step 3","step 4"],
  "prevention": ["tip 1","tip 2","tip 3"],
  "recommendedProducts": [
    {"name": "exact product brand name e.g. Dithane M-45 or Indofil M-45", "type": "Fungicide/Bactericide/Insecticide/Neem-based", "dosage": "exact dosage e.g. 2.5g per litre of water", "frequency": "spray schedule e.g. Every 7 days, 3 sprays"},
    {"name": "second product name if needed", "type": "type", "dosage": "dosage", "frequency": "schedule"}
  ]
}
IMPORTANT: recommendedProducts must have REAL, SPECIFIC product names available in India (e.g. Ridomil Gold, Blitox 50, Bavistin, Dithane M-45, Confidor, Neem Gold). Not generic names.`,
    retranslatePrompt: (data, crop) => `Translate this crop disease report to simple English for an Indian farmer.
Crop: ${crop}
Reply ONLY with this JSON (no markdown):
{
  "diseaseName": "${data.diseaseName}",
  "overview": "translate this: ${data.overview}",
  "symptoms": ${JSON.stringify(data.symptoms)},
  "treatment": ${JSON.stringify(data.treatment)},
  "prevention": ${JSON.stringify(data.prevention)}
}
Keep the diseaseName in English. Translate overview, symptoms, treatment, prevention to simple English.`
  },

  ta: {
    subtitle:           "AI-ஆல் இயங்கும் பயிர் நோய் கண்டறிதல் · CROP IQ",
    diagnoseTitle:      "உங்கள் பயிரை பரிசோதிக்கவும் 🔬",
    diagnoseSubtitle:   "பாதிக்கப்பட்ட இலையின் படத்தை பதிவேற்றவும். AI தானாக பயிரை கண்டறிந்து நோயை பரிசோதிக்கும்.",
    uploadGallery:      "📁 கேலரியிலிருந்து பதிவேற்று",
    uploadCamera:       "📷 கேமராவில் எடு",
    imageReady:         "📸 படம் தயார்",
    detectBtn:          "🔬 நோயை கண்டறி",
    analyzingTitle:     "இலையை பகுப்பாய்கிறது...",
    analyzingSubtitle:  "AI நோயை கண்டறிந்து சிகிச்சை திட்டம் தயாரிக்கிறது.",
    confidence:         "கண்டறிதல் நம்பகத்தன்மை",
    overview:           "நோய் கண்ணோட்டம்",
    symptoms:           "அறிகுறிகள்",
    treatment:          "சிகிச்சை வழிகள்",
    prevention:         "தடுப்பு குறிப்புகள்",
    newScan:            "🔄 புதிய ஸ்கேன்",
    copyReport:         "📋 அறிக்கை நகலெடு",
    reportCopied:       "✅ நகலெடுக்கப்பட்டது!",
    copyFailed:         "⚠️ தோல்வி.",
    onlineMode:         "🌐 ஆன்லைன் — AI",
    offlineMode:        "📴 ஆஃப்லைன் — உள்ளூர் AI",
    geminiFailed:       "⚠️ ஆஃப்லைன் AI க்கு மாறுகிறது...",
    noModel:            "ஆஃப்லைன் மாதிரி இல்லை.",
    detectedBy:         "கண்டறிந்தது",
    detectingCrop:      "படத்திலிருந்து பயிரை கண்டறிகிறது...",
    cropDetectedLabel:  "பயிர் கண்டறியப்பட்டது:",
    cropNotFound:       "⚠️ பயிரை கண்டறிய முடியவில்லை. தெளிவான இலை படம் பதிவேற்றவும்.",
    retranslating:      "🔄 மொழிபெயர்க்கிறது...",
    loadingMsgs: [
      "🔍 இலை அமைப்பை ஸ்கேன் செய்கிறது...",
      "🧬 நோய் முறைகளை பகுப்பாய்கிறது...",
      "📊 தீவிரத்தை கணக்கிடுகிறது...",
      "💊 சிகிச்சை திட்டம் தயாரிக்கிறது...",
      "✅ நோயறிதலை இறுதிசெய்கிறது..."
    ],
    cropDetectPrompt: `இந்த படத்தில் என்ன பயிர் இலை? ONLY JSON: {"crop":"Tomato"}
இந்த பயிர்களில்: Wheat, Paddy / Rice, Millets, Tomato, Corn / Maize, Cotton, Sugarcane, Brinjal / Eggplant, Chili / Pepper.
தெரியாவிட்டால்: {"crop":"unknown"}`,
    geminiPrompt: (crop) => `நீங்கள் Dr. PlantDoctor, 25+ வருட அனுபவமுள்ள தாவர நோயியல் நிபுணர். விவசாயி ${crop} இலை படம் அனுப்பியுள்ளார். நோயை கண்டறியவும்.
ONLY JSON return செய்யவும் (markdown வேண்டாம்):
{"diseaseName":"நோய் பெயர் அல்லது 'ஆரோக்கியமான பயிர்'","severity":"High/Medium/Low/None","confidence":<60-98>,"overview":"தமிழில் 2-3 எளிய வாக்கியங்கள்","symptoms":["அறிகுறி 1","அறிகுறி 2","அறிகுறி 3","அறிகுறி 4"],"treatment":["சிகிச்சை 1","சிகிச்சை 2","சிகிச்சை 3","சிகிச்சை 4"],"prevention":["தடுப்பு 1","தடுப்பு 2","தடுப்பு 3"],"recommendedProducts":[{"name":"இந்தியாவில் கிடைக்கும் உண்மையான தயாரிப்பு பெயர் e.g. Dithane M-45","type":"Fungicide/Bactericide/Insecticide","dosage":"துல்லியமான அளவு e.g. 2.5g per litre","frequency":"spray schedule"},{"name":"இரண்டாவது தயாரிப்பு பெயர்","type":"வகை","dosage":"அளவு","frequency":"schedule"}]}
IMPORTANT: recommendedProducts-ல் இந்தியாவில் கிடைக்கும் REAL product names மட்டும் (Ridomil Gold, Blitox 50, Bavistin, Dithane M-45 போன்றவை).`,
    retranslatePrompt: (data, crop) => `இந்த பயிர் நோய் அறிக்கையை தமிழில் மொழிபெயர்க்கவும். பயிர்: ${crop}
ONLY JSON return செய்யவும்:
{"diseaseName":"${data.diseaseName}","overview":"தமிழில் மொழிபெயர்: ${data.overview}","symptoms":${JSON.stringify(data.symptoms)},"treatment":${JSON.stringify(data.treatment)},"prevention":${JSON.stringify(data.prevention)}}
overview, symptoms, treatment, prevention தமிழில் மொழிபெயர்க்கவும். diseaseName English-ல் வைக்கவும்.`
  },

  hi: {
    subtitle:           "AI-संचालित फसल रोग पहचान · CROP IQ",
    diagnoseTitle:      "अपनी फसल का निदान करें 🔬",
    diagnoseSubtitle:   "प्रभावित पत्ते की फोटो अपलोड करें। AI खुद फसल और रोग पहचानेगा।",
    uploadGallery:      "📁 गैलरी से अपलोड करें",
    uploadCamera:       "📷 कैमरा से फोटो लें",
    imageReady:         "📸 फोटो तैयार है",
    detectBtn:          "🔬 रोग पहचानें",
    analyzingTitle:     "पत्ता विश्लेषण हो रहा है...",
    analyzingSubtitle:  "AI रोग पहचान कर उपचार योजना तैयार कर रहा है।",
    confidence:         "पहचान विश्वसनीयता",
    overview:           "रोग अवलोकन",
    symptoms:           "लक्षण",
    treatment:          "उपचार के तरीके",
    prevention:         "रोकथाम के सुझाव",
    newScan:            "🔄 नया स्कैन",
    copyReport:         "📋 रिपोर्ट कॉपी करें",
    reportCopied:       "✅ कॉपी हो गई!",
    copyFailed:         "⚠️ कॉपी विफल।",
    onlineMode:         "🌐 ऑनलाइन — AI",
    offlineMode:        "📴 ऑफलाइन — स्थानीय AI",
    geminiFailed:       "⚠️ ऑफलाइन AI पर स्विच हो रहा है...",
    noModel:            "ऑफलाइन मॉडल उपलब्ध नहीं।",
    detectedBy:         "द्वारा पहचाना गया",
    detectingCrop:      "फोटो से फसल पहचान रहा है...",
    cropDetectedLabel:  "फसल पहचानी गई:",
    cropNotFound:       "⚠️ फसल नहीं पहचानी। साफ़ पत्ते की फोटो अपलोड करें।",
    retranslating:      "🔄 अनुवाद हो रहा है...",
    loadingMsgs: [
      "🔍 पत्ते की संरचना स्कैन हो रही है...",
      "🧬 रोग पैटर्न विश्लेषण हो रहा है...",
      "📊 गंभीरता की गणना हो रही है...",
      "💊 उपचार योजना तैयार हो रही है...",
      "✅ निदान अंतिम रूप दिया जा रहा है..."
    ],
    cropDetectPrompt: `इस तस्वीर में कौन सी फसल है? ONLY JSON: {"crop":"Tomato"}
इनमें से: Wheat, Paddy / Rice, Millets, Tomato, Corn / Maize, Cotton, Sugarcane, Brinjal / Eggplant, Chili / Pepper.
पता न चले: {"crop":"unknown"}`,
    geminiPrompt: (crop) => `आप Dr. PlantDoctor हैं, 25+ साल के अनुभवी पादप रोग विशेषज्ञ। किसान ने ${crop} की पत्ते की फोटो भेजी। रोग का निदान करें।
ONLY JSON return करें (markdown नहीं):
{"diseaseName":"रोग का नाम या 'स्वस्थ फसल'","severity":"High/Medium/Low/None","confidence":<60-98>,"overview":"हिंदी में 2-3 सरल वाक्य","symptoms":["लक्षण 1","लक्षण 2","लक्षण 3","लक्षण 4"],"treatment":["उपचार 1","उपचार 2","उपचार 3","उपचार 4"],"prevention":["रोकथाम 1","रोकथाम 2","रोकथाम 3"],"recommendedProducts":[{"name":"भारत में उपलब्ध असली उत्पाद नाम e.g. Dithane M-45","type":"Fungicide/Bactericide/Insecticide","dosage":"सटीक मात्रा e.g. 2.5g per litre","frequency":"spray schedule"},{"name":"दूसरे उत्पाद का नाम","type":"प्रकार","dosage":"मात्रा","frequency":"schedule"}]}
IMPORTANT: recommendedProducts में भारत में मिलने वाले REAL product names दें (Ridomil Gold, Blitox 50, Bavistin, Dithane M-45 आदि)।`,
    retranslatePrompt: (data, crop) => `इस फसल रोग रिपोर्ट को हिंदी में अनुवाद करें। फसल: ${crop}
ONLY JSON return करें:
{"diseaseName":"${data.diseaseName}","overview":"हिंदी में अनुवाद: ${data.overview}","symptoms":${JSON.stringify(data.symptoms)},"treatment":${JSON.stringify(data.treatment)},"prevention":${JSON.stringify(data.prevention)}}
overview, symptoms, treatment, prevention हिंदी में अनुवाद करें। diseaseName English में रखें।`
  }
};

/* ══════════════════════════════════════════
   TF.JS
══════════════════════════════════════════ */
const CLASS_NAMES = [
  "Pepper Bell Bacterial Spot","Pepper Bell Healthy","PlantVillage",
  "Potato Early Blight","Potato Late Blight","Potato Healthy",
  "Tomato Bacterial Spot","Tomato Early Blight","Tomato Late Blight",
  "Tomato Leaf Mold","Tomato Septoria Leaf Spot","Tomato Spider Mites",
  "Tomato Target Spot","Tomato Yellow Leaf Curl Virus","Tomato Mosaic Virus","Tomato Healthy"
];
const DISEASE_INFO = {
  "Tomato Late Blight":           { severity:"High",   overview:"Late blight spreads fast and can destroy the whole crop within days.", symptoms:["Dark brown wet patches on leaves","White fuzzy mold under leaves","Black marks on stem","Fruits rot and turn dark"], treatment:["Spray copper fungicide immediately","Cut and burn infected parts","Spray again after 7 days"], prevention:["Buy resistant varieties","Rotate crops every season","Keep space between plants"] },
  "Tomato Early Blight":          { severity:"Medium", overview:"Early blight makes brown target-like spots on older leaves first.", symptoms:["Brown spots with ring patterns","Yellow color around spots","Starts from bottom leaves","Leaves fall off early"], treatment:["Spray mancozeb fungicide","Remove spotted leaves","Add mulch around plant base"], prevention:["Change crop field every year","Water only at roots","Use good quality seeds"] },
  "Tomato Bacterial Spot":        { severity:"Medium", overview:"Bacterial spot makes small dark holes on leaves and fruits. Spreads fast in rain.", symptoms:["Small dark wet spots on leaves","Spots turn brown with yellow edges","Rough spots on fruits","Leaves fall in rainy weather"], treatment:["Spray copper medicine","Remove all sick leaves","Do not touch plants when wet"], prevention:["Use clean disease-free seeds","Do not water from above","Clean tools often"] },
  "Tomato Leaf Mold":             { severity:"Medium", overview:"Leaf mold grows in hot humid conditions covering bottom of leaves.", symptoms:["Light yellow spots on top of leaf","Gray-green mold under leaf","Leaves curl and dry","Fruits become smaller"], treatment:["Open greenhouse for air","Spray chlorothalonil","Remove infected leaves"], prevention:["Keep space between plants","Keep humidity low","Try resistant varieties"] },
  "Tomato Septoria Leaf Spot":    { severity:"Medium", overview:"Septoria makes many small round spots starting from bottom leaves.", symptoms:["Many small round spots","White or gray inside spots","Tiny black dots in center","Bottom leaves first"], treatment:["Spray mancozeb","Remove infected leaves","Add mulch to stop soil splash"], prevention:["Change field every 2-3 years","Do not spray water on leaves","Remove plant waste after harvest"] },
  "Tomato Spider Mites":          { severity:"Medium", overview:"Tiny bugs suck juice from leaves causing yellowing.", symptoms:["Tiny yellow dots all over leaf","Leaf turns bronze or silver","Fine webs under leaves","Leaves curl and fall"], treatment:["Spray strong water jet","Use neem oil spray","Use miticide if severe"], prevention:["Water plants regularly","Keep area dust-free","Check plants weekly"] },
  "Tomato Target Spot":           { severity:"Medium", overview:"Target spot makes circles inside circles on leaves reducing harvest.", symptoms:["Brown spots with ring patterns","Yellow ring around each spot","Spots on fruits and stems","Leaves fall before time"], treatment:["Spray azoxystrobin","Remove sick plant parts","Improve air flow"], prevention:["Use resistant varieties","Change crop location yearly","Do not water from above"] },
  "Tomato Yellow Leaf Curl Virus":{ severity:"High",   overview:"Virus spread by white flies stops plant growth. Almost no fruits produced.", symptoms:["Leaves curl upward at edges","Leaves turn yellow between veins","Plant becomes very small","Very few fruits grow"], treatment:["Remove infected plants — no cure","Kill white flies with sticky traps","Spray insecticide"], prevention:["Buy virus-resistant varieties","Use insect-proof nets","Do not plant near infected fields"] },
  "Tomato Mosaic Virus":          { severity:"High",   overview:"Mosaic virus creates mixed green patches on leaves spreading through tools.", symptoms:["Mixed light-dark green pattern","Leaves become twisted","Plant grows slowly","Fruits are brown inside"], treatment:["Remove all infected plants","Kill aphids","Wash hands and tools with soap"], prevention:["Buy certified virus-free seeds","Keep aphids away","Sanitize tools regularly"] },
  "Tomato Healthy":               { severity:"None",   overview:"Your tomato plant looks healthy! No disease found.", symptoms:["Leaves are green and normal","No spots anywhere","Plant is growing well","Fruits look good"], treatment:["No treatment needed","Keep checking every few days"], prevention:["Check plants every week","Give balanced fertilizer"] },
  "Potato Late Blight":           { severity:"High",   overview:"One of the most dangerous crop diseases. Can destroy whole field fast.", symptoms:["Dark brown wet patches","White mold under leaves","Black marks on stems","Tubers rot and smell"], treatment:["Spray metalaxyl right away","Remove and burn infected parts","Harvest early if very sick"], prevention:["Use certified seed potatoes","Spray fungicide before rain","Avoid overhead watering"] },
  "Potato Early Blight":          { severity:"Medium", overview:"Early blight slows growth and reduces potato size.", symptoms:["Brown spots with ring circles","Yellow around spots","Lower leaves affected first","Leaves drop early"], treatment:["Spray mancozeb","Remove spotted leaves","Give extra potassium"], prevention:["Change field every year","Use certified seed potatoes","Avoid drought stress"] },
  "Potato Healthy":               { severity:"None",   overview:"Potato plant looks healthy! Keep normal farming practice.", symptoms:["Green healthy leaves","No spots or marks","Plant looks strong"], treatment:["No treatment needed","Keep checking weekly"], prevention:["Check plants often","Give proper fertilizer"] },
  "Pepper Bell Bacterial Spot":   { severity:"Medium", overview:"Bacterial spot makes holes in leaves and rough spots on fruits.", symptoms:["Wet dark spots on leaves","Spots turn brown","Rough spots on fruits","Many leaves fall"], treatment:["Spray copper bactericide","Remove sick leaves","Stop overhead watering"], prevention:["Use disease-free seeds","Rotate crop","Clean tools after use"] },
  "Pepper Bell Healthy":          { severity:"None",   overview:"Pepper plant looks healthy! Continue with normal care.", symptoms:["Leaves are green","No disease signs","Plant is growing well"], treatment:["No treatment needed","Keep checking"], prevention:["Check weekly","Feed and water properly"] },
};

/* ══════════════════════════════════════════
   WEATHER
══════════════════════════════════════════ */
const WEATHER_ICONS = {
  0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️",
  45:"🌫️", 48:"🌫️",
  51:"🌦️", 53:"🌦️", 55:"🌧️",
  61:"🌧️", 63:"🌧️", 65:"🌧️",
  71:"❄️", 73:"❄️", 75:"❄️",
  80:"🌦️", 81:"🌧️", 82:"⛈️",
  95:"⛈️", 96:"⛈️", 99:"⛈️"
};

async function loadWeather() {
  try {
    const pos = await new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
    );
    const { latitude: lat, longitude: lon } = pos.coords;

    // Reverse geocode for city name
    let city = "";
    try {
      const geoRes  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      const geoData = await geoRes.json();
      city = geoData.address?.city || geoData.address?.town || geoData.address?.village || geoData.address?.county || "";
      if (city.length > 12) city = city.slice(0, 12) + "…";
    } catch(e) {}

    // Weather from Open-Meteo (no API key!)
    const wRes  = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&timezone=auto`);
    const wData = await wRes.json();
    const temp  = Math.round(wData.current.temperature_2m);
    const code  = wData.current.weathercode;
    const icon  = WEATHER_ICONS[code] || "🌤️";

    document.getElementById("weather-icon").textContent  = icon;
    document.getElementById("weather-temp").textContent  = `${temp}°C`;
    document.getElementById("weather-place").textContent = city || "Your Location";
    document.getElementById("weather-chip").style.display = "flex";
  } catch(e) {
    // Silently fail — weather is optional
    console.log("Weather unavailable:", e.message);
  }
}

/* ══════════════════════════════════════════
   LANGUAGE
══════════════════════════════════════════ */
const LANG_LABELS = { en:"EN", ta:"தமிழ்", hi:"हिं" };

function tr(key) { return T[currentLang]?.[key] || T.en?.[key] || key; }

function applyLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const v = T[lang][el.getAttribute("data-i18n")];
    if (v) el.textContent = v;
  });
  document.documentElement.lang = lang;
  document.getElementById("lang-current-label").textContent = LANG_LABELS[lang];
  // Update ticks
  ["en","ta","hi"].forEach(l => {
    const tick = document.getElementById(`tick-${l}`);
    const item = document.querySelector(`.lang-menu-item[data-lang="${l}"]`);
    if (tick) tick.style.display = l === lang ? "block" : "none";
    if (item) item.classList.toggle("active", l === lang);
  });
}

function toggleLangMenu() {
  const menu = document.getElementById("lang-menu");
  menu.style.display = menu.style.display === "none" ? "block" : "none";
}

function selectLang(lang) {
  document.getElementById("lang-menu").style.display = "none";
  if (lang === currentLang) return;
  applyLanguage(lang);

  // If results are visible — re-translate everything
  if (document.getElementById("results-section").style.display !== "none" && lastResultData) {
    retranslateResults(lang);
  }
}

// Close menu on outside click
document.addEventListener("click", e => {
  if (!e.target.closest("#lang-box") && !e.target.closest("#lang-menu")) {
    const menu = document.getElementById("lang-menu");
    if (menu) menu.style.display = "none";
  }
});

async function retranslateResults(lang) {
  if (!lastResultData || !detectedCrop) return;

  showToast(tr("retranslating"), 2000);

  let isOnline = false;
  try {
    await fetch("https://www.google.com/favicon.ico", { mode:"no-cors", cache:"no-store" });
    isOnline = true;
  } catch(e) {}

  if (!isOnline) {
    // Just update labels offline
    applyLanguage(lang);
    return;
  }

  try {
    const prompt = T[lang].retranslatePrompt(lastResultData, detectedCrop);
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1000 }
      })
    });
    const data   = await res.json();
    const raw    = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());

    // Update only content, keep confidence/severity
    document.getElementById("result-overview").textContent = parsed.overview || lastResultData.overview;
    const fill = (id, items) => {
      document.getElementById(id).innerHTML = items?.length
        ? items.map(i=>`<li>${i}</li>`).join("") : "<li>—</li>";
    };
    fill("result-symptoms",   parsed.symptoms   || lastResultData.symptoms);
    fill("result-treatment",  parsed.treatment  || lastResultData.treatment);
    fill("result-prevention", parsed.prevention || lastResultData.prevention);

    // Re-render products (product names stay, labels update)
    const prodBox = document.getElementById("result-products");
    const products = parsed.recommendedProducts || lastResultData.recommendedProducts;
    if (prodBox && products && products.length && lastResultData.severity !== "None") {
      prodBox.style.display = "block";
      document.getElementById("result-products-list").innerHTML = products.map(p => `
        <div class="product-card">
          <div class="product-name">💊 ${p.name}</div>
          <div class="product-meta">
            <span class="product-tag product-type">${p.type}</span>
            <span class="product-tag product-dose">📏 ${p.dosage}</span>
            <span class="product-tag product-freq">🔁 ${p.frequency}</span>
          </div>
        </div>`).join("");
    }

    // Update labels
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const v = T[lang][el.getAttribute("data-i18n")];
      if (v) el.textContent = v;
    });

  } catch(e) {
    console.log("Retranslate failed:", e.message);
  }
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
window.addEventListener("DOMContentLoaded", () => {
  showSection("upload");
  document.getElementById("history-btn").addEventListener("click", showHistory);
  document.getElementById("history-back-btn").addEventListener("click", () => showSection("upload"));
  applyLanguage("en");
  loadTFModel();
  loadWeather();
});

function showSection(name) {
  ["upload","loading","results","history"].forEach(s => {
    const el = document.getElementById(`${s}-section`);
    if (el) el.style.display = s === name ? "block" : "none";
  });
}

async function loadTFModel() {
  try {
    if (typeof tf !== "undefined") {
      tfModel = await tf.loadLayersModel("model/model.json");
      console.log("✅ TF.js model ready");
    }
  } catch(e) { console.log("ℹ️ TF.js:", e.message); }
}

function showToast(msg, dur = 3000) {
  const el = document.getElementById("toast");
  el.textContent = msg; el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), dur);
}

/* ══════════════════════════════════════════
   FILE UPLOAD → AUTO CROP DETECT
══════════════════════════════════════════ */
document.getElementById("file-gallery").addEventListener("change", e => handleFile(e.target.files[0]));
document.getElementById("file-camera").addEventListener("change",  e => handleFile(e.target.files[0]));

function handleFile(file) {
  if (!file) return;
  imageFile = file;
  const reader = new FileReader();
  reader.onload = async (e) => {
    imageDataUrl = e.target.result;
    document.getElementById("preview-img").src            = imageDataUrl;
    document.getElementById("preview-box").style.display  = "block";
    document.getElementById("preview-overlay").textContent = tr("imageReady");

    detectedCrop = "";
    document.getElementById("crop-detect-box").style.display  = "block";
    document.getElementById("crop-detecting").style.display   = "flex";
    document.getElementById("crop-detecting").querySelector("[data-i18n]").textContent = tr("detectingCrop");
    document.getElementById("crop-detected").style.display    = "none";
    document.getElementById("detect-btn").disabled = true;
    document.getElementById("error-msg").style.display = "none";

    await autoCropDetect();
  };
  reader.readAsDataURL(file);
}

async function autoCropDetect() {
  let isOnline = false;
  try {
    await fetch("https://www.google.com/favicon.ico", { mode:"no-cors", cache:"no-store" });
    isOnline = true;
  } catch(e) {}

  if (!isOnline) { await offlineCropDetect(); return; }

  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { inline_data: { mime_type: imageFile.type || "image/jpeg", data: imageDataUrl.split(",")[1] } },
          { text: tr("cropDetectPrompt") }
        ]}],
        generationConfig: { temperature: 0.1, maxOutputTokens: 50 }
      })
    });
    const data   = await res.json();
    const raw    = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());
    if (parsed.crop && parsed.crop !== "unknown") {
      detectedCrop = parsed.crop;
      showCropDetected(parsed.crop);
    } else { showCropError(); }
  } catch(e) { showCropError(); }
}

async function offlineCropDetect() {
  try {
    if (!tfModel) await loadTFModel();
    if (!tfModel) { showCropError(); return; }

    const img = await new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = imageDataUrl;
    });
    const tensor = tf.tidy(() =>
      tf.browser.fromPixels(img).resizeNearestNeighbor([224,224]).toFloat().div(255.0).expandDims(0)
    );
    const preds     = await tfModel.predict(tensor).data();
    tensor.dispose();
    const topIdx    = Array.from(preds).indexOf(Math.max(...Array.from(preds)));
    const className = CLASS_NAMES[topIdx] || "";
    console.log("TF.js class:", className);

    const cropMap = { "Tomato":"Tomato", "Potato":"Potato", "Pepper":"Chili / Pepper" };
    let crop = "";
    for (const [k,v] of Object.entries(cropMap)) { if (className.includes(k)) { crop = v; break; } }
    if (crop) { detectedCrop = crop; showCropDetected(crop); } else showCropError();
  } catch(e) { console.error(e); showCropError(); }
}

function showCropDetected(name) {
  document.getElementById("crop-detecting").style.display = "none";
  document.getElementById("crop-detected").style.display  = "flex";
  document.getElementById("crop-detected").querySelector("[data-i18n]").textContent = tr("cropDetectedLabel");
  document.getElementById("crop-name-badge").textContent = name;
  document.getElementById("detect-btn").disabled = false;
}

function showCropError() {
  document.getElementById("crop-detecting").style.display  = "none";
  document.getElementById("crop-detect-box").style.display = "none";
  const errEl = document.getElementById("error-msg");
  errEl.style.display = "block";
  errEl.textContent = tr("cropNotFound");
  document.getElementById("detect-btn").disabled = true;
}

/* ══════════════════════════════════════════
   DETECTION
══════════════════════════════════════════ */
document.getElementById("detect-btn").addEventListener("click", runDetection);

async function runDetection() {
  if (!detectedCrop || !imageFile) return;
  showSection("loading");
  document.getElementById("loading-title").textContent = tr("analyzingTitle");
  document.getElementById("loading-sub").textContent   = tr("analyzingSubtitle");

  const msgs = T[currentLang].loadingMsgs;
  let idx = 0;
  loadingInterval = setInterval(() => {
    document.getElementById("loading-step-text").textContent = msgs[idx++ % msgs.length];
  }, 1600);

  let isOnline = false;
  try {
    await fetch("https://www.google.com/favicon.ico", { mode:"no-cors", cache:"no-store" });
    isOnline = true;
  } catch(e) {}

  try {
    if (isOnline) {
      showToast(tr("onlineMode"));
      await runGeminiDetection(detectedCrop);
    } else {
      showToast(tr("offlineMode"));
      await runTFJSDetection(detectedCrop);
    }
  } catch(err) {
    if (isOnline && tfModel) {
      showToast(tr("geminiFailed"));
      try { await runTFJSDetection(detectedCrop); return; } catch(e2) {}
    }
    clearInterval(loadingInterval);
    showSection("upload");
    const errEl = document.getElementById("error-msg");
    errEl.style.display = "block";
    errEl.textContent = "⚠️ " + (err.message || "Detection failed. Try again.");
  }
}

async function runGeminiDetection(crop) {
  const res = await fetch(GEMINI_URL, {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      contents:[{parts:[
        {inline_data:{mime_type:imageFile.type||"image/jpeg",data:imageDataUrl.split(",")[1]}},
        {text:T[currentLang].geminiPrompt(crop)}
      ]}],
      generationConfig:{temperature:0.3, maxOutputTokens:1200}
    })
  });
  clearInterval(loadingInterval);
  if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e.error?.message||`API ${res.status}`); }
  const data = await res.json();
  const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  showResults(JSON.parse(raw.replace(/```json|```/g,"").trim()), crop, "AI");
}

async function runTFJSDetection(crop) {
  if (!tfModel) { await loadTFModel(); if (!tfModel) throw new Error(tr("noModel")); }
  const img = await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=imageDataUrl; });
  const tensor = tf.tidy(()=> tf.browser.fromPixels(img).resizeNearestNeighbor([224,224]).toFloat().div(255.0).expandDims(0));
  const preds  = await tfModel.predict(tensor).data();
  tensor.dispose();
  clearInterval(loadingInterval);
  const topIdx = Array.from(preds).indexOf(Math.max(...Array.from(preds)));
  const name   = CLASS_NAMES[topIdx] || "Unknown";
  const info   = DISEASE_INFO[name] || {
    severity:"Medium", overview:"Disease detected. Consult your local agricultural officer.",
    symptoms:["Abnormal spots on leaves","Unusual color change","Reduced growth"],
    treatment:["Visit local agricultural office","Remove affected parts","Apply fungicide"],
    prevention:["Check plants weekly","Keep field clean","Rotate crops"]
  };
  showResults({diseaseName:name, severity:info.severity, confidence:Math.max(Math.round(preds[topIdx]*100),45),
    overview:info.overview, symptoms:info.symptoms, treatment:info.treatment, prevention:info.prevention
  }, crop, "Offline AI");
}

/* ══════════════════════════════════════════
   SHOW RESULTS
══════════════════════════════════════════ */
function showResults(data, crop, mode) {
  lastResultData = data;
  lastResultMode = mode;
  showSection("results");

  document.getElementById("result-img").src             = imageDataUrl;
  document.getElementById("result-crop").textContent    = crop;
  document.getElementById("result-disease").textContent = data.diseaseName || "Unknown";

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const v = T[currentLang][el.getAttribute("data-i18n")];
    if (v) el.textContent = v;
  });

  const sevClass = {High:"sev-high",Medium:"sev-medium",Low:"sev-low",None:"sev-low"}[data.severity]||"sev-low";
  const sevIcon  = {High:"🔴",Medium:"🟡",Low:"🟢",None:"🟢"}[data.severity]||"🟢";
  document.getElementById("result-severity").innerHTML =
    `<span class="severity-badge ${sevClass}">${sevIcon} ${data.severity} Severity</span>`;

  const pct = Math.min(Math.max(data.confidence||80,30),99);
  document.getElementById("confidence-bars").innerHTML = `
    <div class="confidence-row">
      <div class="conf-label">${tr("confidence")}</div>
      <div class="conf-bar"><div class="conf-fill" style="width:0%" data-target="${pct}%"></div></div>
      <div class="conf-pct">${pct}%</div>
    </div>
    <div style="font-size:0.75rem;color:#5a6a5e;margin-top:8px;">${tr("detectedBy")}: ${mode}</div>`;

  document.getElementById("result-overview").textContent = data.overview || "";
  const fill = (id,items) => { document.getElementById(id).innerHTML = items?.length ? items.map(i=>`<li>${i}</li>`).join("") : "<li>—</li>"; };
  fill("result-symptoms", data.symptoms);
  fill("result-treatment", data.treatment);
  fill("result-prevention", data.prevention);

  // Render recommended products
  const prodBox = document.getElementById("result-products");
  if (data.recommendedProducts && data.recommendedProducts.length && data.diseaseName !== "Healthy Crop" && data.severity !== "None") {
    prodBox.style.display = "block";
    document.getElementById("result-products-list").innerHTML = data.recommendedProducts.map(p => `
      <div class="product-card">
        <div class="product-name">💊 ${p.name}</div>
        <div class="product-meta">
          <span class="product-tag product-type">${p.type}</span>
          <span class="product-tag product-dose">📏 ${p.dosage}</span>
          <span class="product-tag product-freq">🔁 ${p.frequency}</span>
        </div>
      </div>`).join("");
  } else {
    prodBox.style.display = "none";
  }

  setTimeout(()=>{ document.querySelectorAll(".conf-fill").forEach(el=>{ el.style.width=el.dataset.target; }); }, 300);
  window.scrollTo({top:0, behavior:"smooth"});
  saveScan(data, crop, mode);
}

/* ══════════════════════════════════════════
   BACKEND SAVE
══════════════════════════════════════════ */
async function saveScan(data, crop, mode) {
  try {
    await fetch(`${BACKEND_URL}/api/scans/save`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ cropType:crop, diseaseName:data.diseaseName, severity:data.severity,
        confidence:data.confidence, overview:data.overview, symptoms:data.symptoms,
        treatment:data.treatment, prevention:data.prevention,
        recommendedProducts: data.recommendedProducts || [], mode:mode })
    });
  } catch(e) { console.log("ℹ️ Scan not saved"); }
}

/* ══════════════════════════════════════════
   HISTORY
══════════════════════════════════════════ */
async function showHistory() {
  showSection("history");
  document.getElementById("history-list").innerHTML = "<p class='history-empty'>Loading...</p>";
  try {
    const res   = await fetch(`${BACKEND_URL}/api/scans/history`);
    const data  = await res.json();
    const scans = data.scans || [];
    if (!scans.length) { document.getElementById("history-list").innerHTML = "<p class='history-empty'>📭 No scans yet. Start detecting!</p>"; return; }
    document.getElementById("history-list").innerHTML = scans.map(s => {
      const date = new Date(s.createdAt).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
      const sevClass = {High:"sev-high",Medium:"sev-medium",Low:"sev-low",None:"sev-low"}[s.severity]||"sev-low";
      const sevIcon  = {High:"🔴",Medium:"🟡",Low:"🟢",None:"🟢"}[s.severity]||"🟢";
      return `<div class="history-card">
        <div class="history-card-top">
          <div><div class="history-crop">🌱 ${s.cropType}</div><div class="history-disease">${s.diseaseName}</div></div>
          <div class="history-right">
            <span class="severity-badge ${sevClass}">${sevIcon} ${s.severity}</span>
            <button class="history-delete-btn" onclick="deleteScan('${s._id}')">🗑️</button>
          </div>
        </div>
        <div class="history-meta"><span>📅 ${date}</span><span>🎯 ${s.confidence}% confidence</span><span>🤖 ${s.mode}</span></div>
      </div>`;
    }).join("");
  } catch(e) { document.getElementById("history-list").innerHTML = "<p class='history-empty'>⚠️ Server not running. Start backend first.</p>"; }
}

async function deleteScan(id) {
  try { await fetch(`${BACKEND_URL}/api/scans/${id}`,{method:"DELETE"}); showHistory(); }
  catch(e) { showToast("⚠️ Delete failed"); }
}

/* ══════════════════════════════════════════
   NEW SCAN + COPY REPORT
══════════════════════════════════════════ */
document.getElementById("new-scan-btn").addEventListener("click", () => {
  showSection("upload");
  imageFile=null; imageDataUrl=null; detectedCrop=""; lastResultData=null;
  document.getElementById("preview-box").style.display     = "none";
  document.getElementById("preview-img").src               = "";
  document.getElementById("file-gallery").value            = "";
  document.getElementById("file-camera").value             = "";
  document.getElementById("crop-detect-box").style.display = "none";
  document.getElementById("detect-btn").disabled           = true;
  document.getElementById("error-msg").style.display       = "none";
  window.scrollTo({top:0,behavior:"smooth"});
});

document.getElementById("share-btn").addEventListener("click", () => {
  const crop    = document.getElementById("result-crop").textContent;
  const disease = document.getElementById("result-disease").textContent;
  const overview= document.getElementById("result-overview").textContent;
  const trt  = [...document.querySelectorAll("#result-treatment li")].map(l=>"• "+l.textContent).join("\n");
  const prv  = [...document.querySelectorAll("#result-prevention li")].map(l=>"• "+l.textContent).join("\n");
  const prodSection = document.getElementById("result-products");
  let prodsText = "";
  if (prodSection && prodSection.style.display !== "none") {
    const prods = [...document.querySelectorAll(".product-card")].map(c => {
      const name = c.querySelector(".product-name")?.textContent || "";
      const tags = [...c.querySelectorAll(".product-tag")].map(t=>t.textContent).join(" | ");
      return `• ${name} — ${tags}`;
    }).join("\n");
    if (prods) prodsText = `\n\n🧪 Recommended Products:\n${prods}`;
  }
  navigator.clipboard.writeText(`🌱 PlantDoctor Report — Crop IQ | SIH 2025\n\nCrop: ${crop}\nDisease: ${disease}\n\n📋 ${tr("overview")}:\n${overview}\n\n💊 ${tr("treatment")}:\n${trt}\n\n🛡️ ${tr("prevention")}:\n${prv}${prodsText}\n\n— Plant Doctor · Crop IQ`)
    .then(()=>showToast(tr("reportCopied"))).catch(()=>showToast(tr("copyFailed")));
});

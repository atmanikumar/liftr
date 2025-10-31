import { NextResponse } from 'next/server';
import { getGames, getUserById } from '@/lib/storage';

// Tamil Insights Generator - No AI needed, pure rule-based intelligence with humor!

// Tamil phrases library with humor
const TAMIL_PHRASES = {
  // Performance levels
  performance: {
    excellent: ['சூப்பர்', 'அருமை', 'சிறப்பு', 'மிகச்சிறந்த'],
    good: ['நல்ல', 'பரவாயில்லை', 'திறமையான', 'ஓகே'],
    average: ['சராசரி', 'நடுத்தர', 'சரி'],
    poor: ['சற்று குறைவு', 'மேம்படுத்த வேண்டும்', 'கவனம் தேவை'],
    bad: ['பலவீனம்', 'ரொம்ப குறைவு', 'வேலை செய்ய வேண்டும்']
  },
  
  // Humorous intros based on win rate
  intros: {
    champion: ['இந்த ப்ளேயர் தான் அசல் சாம்பியன்!', 'வெற்றியின் சிகரம்!', 'இவரை எல்லாரும் பயந்துதான் விளையாடுவாங்க!', 'கேம்ல கிங்/குயின்!', 'இவங்க விளையாடினா எதிராளி தொலைஞ்சுருவாங்க!', 'லெஜண்ட் லெவல் ப்ளேயர்!'],
    strong: ['நல்ல திறமையான ப்ளேயர்!', 'இவரோட ஸ்கில் அசத்தல்!', 'நல்ல பார்ம்ல இருக்காங்க!', 'வலுவான விளையாட்டு காட்டுறாங்க!', 'எதிராளிகள் கஷ்டப்படுவாங்க!', 'நல்ல செயல்திறன்!'],
    decent: ['சராசரி ப்ளேயர்!', 'இன்னும் கொஞ்சம் முயற்சி வேணும்!', 'நல்ல முன்னேற்றம் தெரியுது!', 'நடுத்தர நிலை ப்ளேயர்!', 'ஓகே பெர்ஃபார்மன்ஸ்!', 'இன்னும் நல்லா ஆகலாம்!'],
    struggling: ['இன்னும் பயிற்சி வேணும் போல!', 'கொஞ்சம் கஷ்டப்படுறாங்க!', 'ஆனா விடாம விளையாடுறாங்க!', 'போராடிட்டு இருக்காங்க!', 'முயற்சி நல்லா இருக்கு!', 'இன்னும் டெவலப் ஆகிட்டு வராங்க!'],
    beginner: ['புதுசா ஆரம்பிச்சிருக்காங்க!', 'கத்துக்கிட்டு இருக்காங்க!', 'பொறுமையா முயற்சி செய்யுறாங்க!', 'பிகினர் ஸ்டேஜ்ல இருக்காங்க!', 'இப்போ தான் கேம் புரிய ஆரம்பிச்சிருக்கு!', 'லெர்னிங் ஃபேஸ்ல இருக்காங்க!']
  },
  
  // Playing styles
  styles: {
    aggressive: ['அட்டாக் விளையாட்டு!', 'ரிஸ்க் எடுக்க பயப்படுறதில்லை!', 'துணிச்சலான ஸ்டைல்!', 'ஆபத்தான விளையாட்டு பிடிக்கும்!', 'போல்ட்டா விளையாடுறாங்க!', 'அக்ரசிவ் ஸ்டைல் தான் ஸ்பெஷல்!'],
    cautious: ['கவனமான விளையாட்டு!', 'யோசிச்சு விளையாடுறவங்க!', 'ஸ்டிராடஜிக் ப்ளேயர்!', 'பாதுகாப்பா நடந்துக்குவாங்க!', 'கால்குலேட்டட் ரிஸ்க் எடுப்பாங்க!', 'புத்திசாலித்தனமான அணுகுமுறை!'],
    balanced: ['பேலன்ஸ்டு விளையாட்டு!', 'சமநிலை வேணும்னா இவங்க தான்!', 'சிட்யுவேஷன் பார்த்து விளையாடுவாங்க!', 'சூழ்நிலைக்கு ஏற்ப மாறுவாங்க!', 'எப்போ ரிஸ்க், எப்போ செஃப்னு தெரியும்!', 'ஃபிளெக்ஸிபிள் அப்ரோச்!']
  },
  
  // Win rate comments
  winRate: {
    dominating: ['ஜெயிக்கிறது இவங்களுக்கு சாதாரண விஷயம்!', 'வெற்றி வேற லெவல்!', 'எதிராளிகள் எல்லாம் தோத்தே போயிருவாங்க!', 'வின் வாங்குறது சுலபம்!', 'டாமினேட் பண்ணிட்டு இருக்காங்க!'],
    good: ['நல்ல வின் ரேட்!', 'ஜெயிக்கிறது தெரிஞ்சவங்க!', 'பெரும்பாலும் வெல்றாங்க!', 'வெற்றி நல்லா வருது!', 'வின் பர்சன்டேஜ் சூப்பர்!'],
    moderate: ['போராடி வெல்றாங்க!', 'வின் வந்துட்டே இருக்கு!', 'நல்ல கம்ப்ரிடிட்டர்!', 'முயற்சி செய்து ஜெயிக்கிறாங்க!', 'அவ்வப்போது வெல்றாங்க!'],
    low: ['வின் வர கஷ்டப்படுறாங்க!', 'ஜெயிக்கிறது கொஞ்சம் கஷ்டம்!', 'வெற்றி எப்போதாவது வரும்!', 'வின் ரேட் மேம்படுத்தணும்!', 'ஜெயிக்க இன்னும் பயிற்சி வேணும்!'],
    rare: ['வின் கொஞ்சம் ரேர்!', 'ஜெயிக்கிறது ரொம்ப கம்மி!', 'வெற்றி பொக்கிஷம் மாதிரி!', 'வெல்றது அபூர்வம்!', 'வின் வர நெறைய நாள் ஆகுது!']
  },
  
  // Drop strategy (Rummy specific)
  dropStyle: {
    neverDrops: ['ட்ராப் அடிக்கவே மாட்டாங்க!', 'எப்பவும் ஃபைட் பண்ணுவாங்க!', 'கடைசி வரைக்கும் போராடுவாங்க!', 'ட்ராப் அடிக்க மறுக்கிறாங்க!', 'நோ சரண்டர் போலிசி!', 'எதையும் விடமாட்டாங்க!'],
    lowDrop: ['ட்ராப் ரொம்ப கம்மி!', 'கரெக்டா ட்ராப் பண்ணுவாங்க!', 'வீணா ட்ராப் அடிக்க மாட்டாங்க!', 'அவசியம்னா மட்டும் விடுவாங்க!', 'சிலெக்டிவ் ட்ராப்பிங்!', 'குறைவான ட்ராப் ரேட்!'],
    balanced: ['நல்ல ட்ராப் ஸ்ட்ராடஜி!', 'சிட்யுவேஷன் பார்த்து ட்ராப் பண்ணுவாங்க!', 'சரியான நேரத்துல விடுவாங்க!', 'பேர்ஃபெக்ட் ட்ராப் டைமிங்!', 'எப்போ விடணும்னு தெரியும்!', 'சமநிலையான அணுகுமுறை!'],
    frequent: ['ட்ராப் அடிக்க ஆசை!', 'கொஞ்சம் அதிகமா ட்ராப் பண்ணுறாங்க!', 'பொறுமை கொஞ்சம் குறைவு!', 'விரைவா முடிவு எடுப்பாங்க!', 'அடிக்கடி ட்ராப் ஆகுது!', 'கொஞ்சம் ஓவர்-கரஷஸ்!'],
    excessive: ['ட்ராப் கிங்/குயின்!', 'எல்லா ஹேண்ட்லயும் ட்ராப் பண்ணிடுவாங்க!', 'விளையாடாம இருக்கிறது அதிகம்!', 'ட்ராப் ரேட் ரொம்ப ஹை!', 'ரொம்ப அதிகமா விடுறாங்க!', 'பெர்ஃபெக்ட் கார்ட்ஸ் வேணும் போல!']
  },
  
  // Finals performance
  finals: {
    master: ['ஃபைனல்ஸ்ல எப்பவும் இருப்பாங்க!', 'கடைசி வரைக்கும் போய்டுவாங்க!', 'ஃபைனல்ஸ் இவங்களுக்கு ஹோம் கிரவுண்ட்!', 'ஃபைனல்ஸ் ரீச் மாஸ்டர்!', 'எப்பவுமே கடைசி வரைக்கும்!', 'ஃபைனல்ஸ் ஸ்பெஷலிஸ்ட்!'],
    good: ['ஃபைனல்ஸ்ல நல்ல ரேஷியோ!', 'கடைசி வரைக்கும் சர்வைவ் பண்ணுவாங்க!', 'ஃபைனல்ஸ் ரீச் நல்லா இருக்கு!', 'பெரும்பாலும் ஃபைனல்ஸ் வந்துடுவாங்க!', 'லாஸ்ட் லெக் வரைக்கும் நல்லா இருக்கு!', 'கேம் முழுசும் இருப்பாங்க!'],
    moderate: ['ஃபைனல்ஸ் எப்போதாவது!', 'சில டைம் மட்டும் ஃபைனல்ஸ்ல இருப்பாங்க!', 'ஃபைனல்ஸ் வர போராடுறாங்க!', 'சரி பாதி கேம்ஸ் ஃபைனல்ஸ் வருவாங்க!', 'ஃபைனல்ஸ் ரீச் ஓகே லெவல்!', 'சில வேளை வருவாங்க!'],
    poor: ['ஃபைனல்ஸ் வர கஷ்டப்படுறாங்க!', 'கடைசி வரைக்கும் போகிறது ரேர்!', 'ஃபைனல்ஸ் ரீச் மேம்படுத்தணும்!', 'அடிக்கடி நடுவுலயே அவுட் ஆகுறாங்க!', 'ஃபைனல்ஸ் வர்றது கம்மி!', 'சீக்கிரமே நொக் அவுட் ஆகிடுறாங்க!']
  },
  
  // Round performance
  rounds: {
    champion: ['ரவுண்ட்ல தான் அசுரன்!', 'ஒவ்வொரு ரவுண்ட்லயும் ஆதிக்கம்!', 'ரவுண்ட் ஜெயிக்கிறது இவங்க ஸ்பெஷல்!', 'ரவுண்ட் வின்னர் தான்!', 'எல்லா ரவுண்ட்லயும் பவர் ஃபுல்!', 'ரவுண்ட் கிங்/குயின்!'],
    good: ['ரவுண்ட்ல நல்லா பெர்ஃபார்ம் பண்ணுறாங்க!', 'ரவுண்ட் வின் நல்லா இருக்கு!', 'பல ரவுண்ட் ஜெயிச்சிருக்காங்க!', 'ரவுண்ட் பெர்ஃபார்மன்ஸ் சூப்பர்!', 'அடிக்கடி ரவுண்ட் ஜெயிக்கிறாங்க!', 'ரவுண்ட் ப்ளே நல்லா இருக்கு!'],
    average: ['ரவுண்ட்ல சராசரி!', 'எப்போதாவது ரவுண்ட் ஜெயிக்கிறாங்க!', 'ரவுண்ட் வின் ஓகே லெவல்!', 'ரவுண்ட் பெர்ஃபார்மன்ஸ் நார்மல்!', 'சில ரவுண்ட் மட்டும் ஜெயிக்கிறாங்க!', 'ரவுண்ட் ப்ளே சரி!'],
    poor: ['ரவுண்ட் ஜெயிக்கிறது கஷ்டம்!', 'ரவுண்ட்ல பெர்ஃபார்ம் கொஞ்சம் குறைவு!', 'ரவுண்ட் வின் மேம்படுத்தணும்!', 'ரவுண்ட்ல அடிக்கடி தோக்குறாங்க!', 'ரவுண்ட் ஜெயிக்க கஷ்டப்படுறாங்க!', 'ரவுண்ட் ஸ்கில் இன்க்ரீஸ் செய்யணும்!']
  },
  
  // Points control
  points: {
    excellent: ['பாயிண்ட்ஸ் கண்ட்ரோல் அசத்தல்!', 'மிக கம்மி பாயிண்ட்ஸ் வாங்குறாங்க!', 'பாயிண்ட் மேனேஜ்மென்ட் சூப்பர்!', 'பாயிண்ட் கண்ட்ரோல் மாஸ்டர்!', 'மிகவும் குறைவான பாயிண்ட்ஸ்!', 'பாயிண்ட் லாஸ் மினிமம்!'],
    good: ['பாயிண்ட்ஸ் நல்லா கண்ட்ரோல் பண்ணுறாங்க!', 'பாயிண்ட் கம்மியா வச்சிருக்காங்க!', 'பாயிண்ட் அவரேஜ் நல்லா இருக்கு!', 'பாயிண்ட் மேனேஜ்மென்ட் நல்லா தெரியுது!', 'குறைவான பாயிண்ட்ஸ் தான் வாங்குவாங்க!', 'பாயிண்ட் லிமிட்ல வச்சிருக்காங்க!'],
    average: ['பாயிண்ட்ஸ் ஓகே!', 'பாயிண்ட்ஸ் சராசரி லெவல்!', 'பாயிண்ட் கண்ட்ரோல் நார்மல்!', 'பாயிண்ட் அவரேஜ் மீடியம்!', 'பாயிண்ட்ஸ் மத்திம நிலையில்!', 'ஓகே பாயிண்ட் மேனேஜ்மென்ட்!'],
    poor: ['பாயிண்ட்ஸ் ரொம்ப அதிகம்!', 'பாயிண்ட் வாங்குறது அதிகம்!', 'பாயிண்ட் கண்ட்ரோல் கவனிக்கணும்!', 'அதிக பாயிண்ட்ஸ் சேர்றாங்க!', 'பாயிண்ட் லாஸ் ஹை!', 'பாயிண்ட் மேனேஜ்மென்ட் ஸ்கில் வேணும்!'],
    terrible: ['பாயிண்ட்ஸ் குவியுது!', 'பாயிண்ட் மேனேஜ்மென்ட் சீரியஸா கவனிக்கணும்!', 'பாயிண்ட்ஸ் வேற லெவல்ல அதிகம்!', 'ரொம்ப ரொம்ப அதிக பாயிண்ட்ஸ்!', 'பாயிண்ட் கண்ட்ரோல் இல்லவே இல்லை!', 'பாயிண்ட்ஸ் அபாரமா சேர்றாங்க!']
  },
  
  // Recent form
  momentum: {
    hot: ['தற்போது ஃபார்ம்ல இருக்காங்க!', 'சமீபத்துல நல்லா விளையாடுறாங்க!', 'மொமண்டம் ஃபுல் ஸ்பீட்ல!', 'கரண்ட் ஃபார்ம் பீக்ல!', 'சமீபத்துல ஃபயர்ல இருக்காங்க!', 'ஹாட் ஸ்ட்ரீக்ல போயிட்டு இருக்காங்க!'],
    improving: ['ஃபார்ம் நல்லா வர்றதா தெரியுது!', 'முன்னேற்றம் நல்லா இருக்கு!', 'கடந்த சில கேம்ஸ் பாசிடிவ்!', 'ஃபார்ம் மேலே வருது!', 'இம்ப்ரூவ்மென்ட் நல்லா தெரியுது!', 'சமீபத்துல பெட்டர் ஆகிட்டு வருது!'],
    steady: ['ஃபார்ம் ஸ்டெடியா இருக்கு!', 'சீராக விளையாடிட்டு இருக்காங்க!', 'கன்சிஸ்டன்ட் பெர்ஃபார்மன்ஸ்!', 'நிலையான விளையாட்டு!', 'ஏற்ற இறக்கம் இல்லாம இருக்காங்க!', 'ஸ்டேபிள் ஃபார்ம்!'],
    declining: ['சமீபத்துல ஃபார்ம் கொஞ்சம் டவுன்!', 'ஃபார்ம் ரிகவர் ஆகணும்!', 'கடந்த சில கேம்ஸ் நல்லா இல்லை!', 'ஃபார்ம் ட்ராப் ஆயிருக்கு!', 'டிப்ல போயிருக்காங்க!', 'முன்னாடி மாதிரி இல்லை!'],
    cold: ['தற்போது ஃபார்ம் இல்லை!', 'சமீபத்துல ரொம்ப ஸ்ட்ரக்கிள்!', 'ஃபார்ம் வேகமா திரும்ப வேணும்!', 'கோல்ட் ஸ்ட்ரீக்ல இருக்காங்க!', 'ஃபார்ம் பாட்டம்ல!', 'ரொம்ப கஷ்டமான டைம்!']
  },
  
  // Experience level
  experience: {
    veteran: ['அனுபவம் மிக்க வீரர்!', 'பழைய ஆள்!', 'காலம் காலமா விளையாடுறவங்க!', 'வெட்டரன் ப்ளேயர்!', 'எக்ஸ்பீரியன்ஸ்ட் கேமர்!', 'சீனியர் ப்ளேயர்!'],
    experienced: ['நல்ல அனுபவம் உள்ளவர்!', 'கேம் தெரிஞ்சவங்க!', 'எக்ஸ்பீரியன்ஸ் நல்லா இருக்கு!', 'நல்ல அனுபவசாலி!', 'கேம் புரிஞ்சவங்க!', 'நல்ல நெளிவு சுளிவு தெரிஞ்சவங்க!'],
    intermediate: ['இன்னும் கத்துக்கிட்டு இருக்காங்க!', 'அனுபவம் கூடிட்டே வருது!', 'நல்லா முன்னேறிட்டு இருக்காங்க!', 'மிட்-லெவல் ப்ளேயர்!', 'டெவலப்மென்ட் ஸ்டேஜ்ல!', 'இன்னும் லெர்ன் பண்ணிட்டு இருக்காங்க!'],
    newbie: ['புதுசா ஆரம்பிச்சவங்க!', 'பிகினர் லெவல்!', 'இப்போ தான் கேம் புரிஞ்சிக்கிட்டு வருது!', 'நியூபீ ப்ளேயர்!', 'ஃப்ரெஷ் ஸ்டார்டர்!', 'இப்போதான் ஸ்டார்ட் பண்ணிருக்காங்க!']
  },
  
  // Advice/improvements
  advice: {
    general: ['இன்னும் கொஞ்சம் கவனிச்சா இன்னும் நல்லா ஆகலாம்!', 'பயிற்சி தொடர்ந்தா இன்னும் சூப்பர் ஆகிடுவாங்க!'],
    dropMore: ['கொஞ்சம் அதிகமா ட்ராப் பண்ணா நல்லா இருக்கும்!', 'தேவையில்லாத ஹேண்ட்ஸ் விடலாம்!'],
    dropLess: ['கொஞ்சம் குறைவா ட்ராப் பண்ணலாம்!', 'பொறுமையா விளையாடினா வின் வரும்!'],
    finalsStrategy: ['ஃபைனல்ஸ் வர முயற்சி பண்ணலாம்!', 'கடைசி வரைக்கும் ஃபைட் பண்ணுங்க!'],
    pointControl: ['பாயிண்ட்ஸ் கம்மியா வைக்க முயற்சி செய்யுங்க!', 'பாயிண்ட் மேனேஜ்மென்ட்ல கவனம் வைங்க!'],
    roundStrategy: ['ரவுண்ட்ல இன்னும் ஃபோகஸ் பண்ணுங்க!', 'ஒவ்வொரு ரவுண்ட்லயும் கவனமா விளையாடுங்க!']
  },
  
  // Round-by-round behavior patterns
  roundBehavior: {
    earlyDropper: ['ஆரம்பத்துலயே ட்ராப் பண்ணிடுவாங்க!', 'முதல் சில ரவுண்ட்ல விரைவா விடுவாங்க!', 'ஆரம்பமே கவனமா ஆராய்ச்சி பண்ணுவாங்க!', 'எர்லி ட்ராப் ஸ்ட்ராடஜி!', 'சீக்கிரமே முடிவு எடுப்பாங்க!', 'ஸ்டார்ட்லயே விட்டுடுவாங்க!'],
    lateDropper: ['கடைசி வரைக்கும் முயற்சி செய்து விடுவாங்க!', 'நல்ல நேரம் வரைக்கும் காத்திருப்பாங்க!', 'தாமதமா தான் ட்ராப் பண்ணுவாங்க!', 'லேட் ட்ராப் பேட்டர்ன்!', 'கடைசி வரைக்கும் ட்ரை பண்ணுவாங்க!', 'பொறுமையா வெயிட் பண்ணுவாங்க!'],
    consistentPlayer: ['எல்லா ரவுண்ட்லயும் சீரா விளையாடுவாங்க!', 'ஒவ்வொரு ரவுண்ட்லயும் கன்சிஸ்டென்ட்!', 'நிலையான விளையாட்டு முறை!', 'யூனிஃபார்ம் பெர்ஃபார்மன்ஸ்!', 'எல்லா ரவுண்ட்லயும் ஒரே மாதிரி!', 'ஸ்டெடி எட்டி வெரி ரவுண்ட்!'],
    riskTaker: ['ஹை ரிஸ்க் எடுக்க பிடிக்கும்!', 'ஆபத்து விளையாட்டு தான் ஸ்பெஷல்!', 'பெரிய ரிஸ்க், பெரிய வின்!', 'டேஞ்சர்ஸ் கேம் விளையாடுவாங்க!', 'போல்ட் மூவ்ஸ் அதிகம்!', 'ரிஸ்க்கி ஸ்ட்ராடஜி!'],
    safePlayer: ['பாதுகாப்பான விளையாட்டு!', 'கவனமா ரிஸ்க் எடுப்பாங்க!', 'சேஃப் பிளே தான் ஸ்ட்ராடஜி!', 'காஷஸ் அப்ரோச்!', 'ரிஸ்க் மினிமைஸ் பண்ணுவாங்க!', 'செக்யூர் விளையாட்டு!']
  },
  
  // Drop timing patterns
  dropTiming: {
    firstRound: ['முதல் ரவுண்ட்லயே டிசிஷன் எடுப்பாங்க!', 'ஆரம்பத்துல கூட வேகமா ட்ராப்!', 'ஃபர்ஸ்ட் ரவுண்ட்ல அதிகம் விடுவாங்க!', 'எர்லி ரவுண்ட் ட்ராப்ஸ் அதிகம்!', 'ஸ்டார்டிங் ரவுண்ட்ஸ்ல அதிகமா விடுவாங்க!', 'ஆரம்ப கட்டத்துல விடுறது அதிகம்!'],
    midGame: ['நடுவுல தான் அதிகம் ட்ராப் பண்ணுவாங்க!', 'மிட் கேம்ல முடிவு எடுப்பாங்க!', 'நடுப்பகுதியில் கவனமா ட்ராப்!', 'மிடில் ரவுண்ட்ஸ்ல விடுவாங்க!', 'கேம் ஹாஃப் ஆன பின் ட்ராப்!', 'நடுவுல தான் டிசிஷன் எடுப்பாங்க!'],
    lateGame: ['கடைசி வரைக்கும் ஹோப் வச்சிருப்பாங்க!', 'லேட் கேம்ல தான் விடுவாங்க!', 'நிறைய பாயிண்ட்ஸ் வாங்கியே விடுவாங்க!', 'ஃபைனல் ரவுண்ட்ஸ்ல விடுறாங்க!', 'கடைசி வரைக்கும் ஹேங் ஆன்!', 'லாஸ்ட் ஸ்டேஜ்ல விடுவாங்க!'],
    balanced: ['சிட்யுவேஷன் பார்த்து ட்ராப் டைமிங் மாறும்!', 'நல்ல டைமிங் சென்ஸ் இருக்கு!', 'எப்போ ட்ராப் பண்ணணும்னு தெரியும்!', 'ஃபிளெக்ஸிபிள் ட்ராப் டைமிங்!', 'எல்லா ஸ்டேஜ்லயும் விடுவாங்க!', 'பேலன்ஸ்ட் அப்ரோச் டு ட்ராப்பிங்!']
  },
  
  // Score patterns
  scorePatterns: {
    lowScorer: ['பொதுவா கம்மி பாயிண்ட்ஸ் தான் வாங்குவாங்க!', 'ஸ்கோர் எப்பவும் லோவா இருக்கும்!', 'பாயிண்ட்ஸ் கண்ட்ரோல் நல்லா தெரியுது!', 'குறைவான பாயிண்ட்ஸ் பேட்டர்ன்!', 'லோ ஸ்கோரிங் ப்ளேயர்!', 'மினிமல் பாயிண்ட்ஸ் வாங்குவாங்க!'],
    moderateScorer: ['சராசரி பாயிண்ட்ஸ் வாங்குவாங்க!', 'ஸ்கோர் மீடியம் லெவல்ல!', 'பாயிண்ட்ஸ் ஓகேயா மேனேஜ் பண்ணுவாங்க!', 'மத்திம பாயிண்ட்ஸ் பேட்டர்ன்!', 'அவரேஜ் ஸ்கோரிங்!', 'நார்மல் பாயிண்ட்ஸ் ரேஞ்ச்ல!'],
    highScorer: ['அதிக பாயிண்ட்ஸ் வாங்குறது அதிகம்!', 'ஸ்கோர் கொஞ்சம் ஹையா போகும்!', 'பாயிண்ட்ஸ் குவியுது அடிக்கடி!', 'ஹை ஸ்கோரிங் பேட்டர்ன்!', 'பாயிண்ட்ஸ் அதிகமா சேர்றாங்க!', 'ஹெவி பாயிண்ட் லோட்!'],
    volatile: ['சில கேம்ஸ் கம்மி, சில கேம்ஸ் அதிகம்!', 'பாயிண்ட்ஸ் ஏற்றத்தாழ்வு அதிகம்!', 'அன்ப்ரெடிக்டபிள் ஸ்கோரிங் பேட்டர்ன்!', 'இன்கன்சிஸ்டென்ட் ஸ்கோர்ஸ்!', 'வோலாட்டில் பாயிண்ட்ஸ்!', 'ஏற்ற இறக்கம் அதிகம்!']
  },
  
  // Unique English titles (generic, game-agnostic, stable)
  uniqueTitles: {
    // Elite tier (50%+ win rate)
    elite: ['The Champion', 'The Legend', 'The Dominator', 'The Master', 'The Virtuoso'],
    
    // Expert tier (40-49% win rate)
    expert: ['The Expert', 'The Ace', 'The Pro', 'The Tactician', 'The Sharpshooter'],
    
    // Strong tier (35-39% win rate)
    strong: ['The Contender', 'The Competitor', 'The Challenger', 'The Warrior', 'The Fighter'],
    
    // Solid tier (30-34% win rate)
    solid: ['The Reliable', 'The Steady', 'The Consistent', 'The Dependable', 'The Rock'],
    
    // Developing tier (25-29% win rate)
    developing: ['The Apprentice', 'The Student', 'The Rising Star', 'The Climber', 'The Prospect'],
    
    // Learning tier (20-24% win rate)
    learning: ['The Learner', 'The Rookie', 'The Hopeful', 'The Seeker', 'The Trailblazer'],
    
    // Beginner tier (15-19% win rate)
    beginner: ['The Newcomer', 'The Explorer', 'The Starter', 'The Pathfinder', 'The Adventurer'],
    
    // Entry tier (<15% win rate)
    entry: ['The Beginner', 'The Fresh Face', 'The New Blood', 'The Initiate', 'The Pioneer']
  }
};

// Helper to randomly pick from array
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Determine unique title based on player stats
// STABLE: Only changes when win rate crosses tier boundaries
// DETERMINISTIC: Uses player ID to ensure same title within tier
function getUniqueTitle(summary, userId) {
  // Use win rate to determine tier (game-agnostic, stable)
  const winRate = summary.winRate;
  let tier, tierOptions;
  
  if (winRate >= 50) {
    tier = 'elite';
    tierOptions = TAMIL_PHRASES.uniqueTitles.elite;
  } else if (winRate >= 40) {
    tier = 'expert';
    tierOptions = TAMIL_PHRASES.uniqueTitles.expert;
  } else if (winRate >= 35) {
    tier = 'strong';
    tierOptions = TAMIL_PHRASES.uniqueTitles.strong;
  } else if (winRate >= 30) {
    tier = 'solid';
    tierOptions = TAMIL_PHRASES.uniqueTitles.solid;
  } else if (winRate >= 25) {
    tier = 'developing';
    tierOptions = TAMIL_PHRASES.uniqueTitles.developing;
  } else if (winRate >= 20) {
    tier = 'learning';
    tierOptions = TAMIL_PHRASES.uniqueTitles.learning;
  } else if (winRate >= 15) {
    tier = 'beginner';
    tierOptions = TAMIL_PHRASES.uniqueTitles.beginner;
  } else {
    tier = 'entry';
    tierOptions = TAMIL_PHRASES.uniqueTitles.entry;
  }
  
  // Use user ID to deterministically pick same title within tier
  // This ensures the title doesn't change unless performance tier changes
  const userIdNum = parseInt(userId) || 0;
  const index = userIdNum % tierOptions.length;
  
  return tierOptions[index];
}

// Analyze round-by-round patterns from games
function analyzeRoundPatterns(games, userId) {
  let earlyDrops = 0; // First 3 rounds
  let midDrops = 0;   // Rounds 4-6
  let lateDrops = 0;  // Rounds 7+
  let totalDrops = 0;
  let totalRoundsAnalyzed = 0;
  let roundScores = [];
  
  games.forEach(game => {
    if (!game.rounds) return;
    
    game.rounds.forEach((round, index) => {
      if (!round.scores || round.scores[userId] === undefined) return;
      
      totalRoundsAnalyzed++;
      const score = round.scores[userId] || 0;
      roundScores.push(score);
      
      const isDropped = (round.drops && round.drops[userId]) || (round.doubleDrops && round.doubleDrops[userId]);
      
      if (isDropped) {
        totalDrops++;
        const roundNum = index + 1;
        if (roundNum <= 3) earlyDrops++;
        else if (roundNum <= 6) midDrops++;
        else lateDrops++;
      }
    });
  });
  
  // Calculate patterns
  const dropTiming = totalDrops > 0 ? {
    early: (earlyDrops / totalDrops) * 100,
    mid: (midDrops / totalDrops) * 100,
    late: (lateDrops / totalDrops) * 100
  } : { early: 0, mid: 0, late: 0 };
  
  // Score variability
  let scoreVariability = 0;
  if (roundScores.length > 0) {
    const avgScore = roundScores.reduce((a, b) => a + b, 0) / roundScores.length;
    const variance = roundScores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / roundScores.length;
    scoreVariability = Math.sqrt(variance);
  }
  
  return {
    dropTiming,
    scoreVariability,
    avgRoundScore: roundScores.length > 0 ? roundScores.reduce((a, b) => a + b, 0) / roundScores.length : 0,
    totalRoundsAnalyzed
  };
}

// Generate Tamil insights with humor
async function generateInsights(summary, games, gameType) {
  const highlights = [];
  
  // Generate highlights based on performance
  if (summary.recentForm.winRate > summary.winRate + 10) {
    highlights.push('Hot Streak');
  }
  if (summary.winRate >= 40) {
    highlights.push('Dominant');
  }
  if (summary.finalsRate >= 60) {
    highlights.push('Finals Master');
  }
  if (summary.dropRate <= 15) {
    highlights.push('Brave Heart');
  } else if (summary.dropRate >= 35) {
    highlights.push('Strategic');
  }
  if (summary.roundWinRate >= 25) {
    highlights.push('Round Champion');
  }
  if (summary.avgPointsPerRound <= 20) {
    highlights.push('Low Scorer');
  }
  
  // Win streak detection
  const recentWins = games.slice(0, 10).filter(g => {
    const isWinner = g.winner === summary.userId || (g.winners && g.winners.includes(summary.userId));
    return isWinner;
  }).length;
  
  if (recentWins >= 5) {
    highlights.push('Win Streak');
  }
  
  if (games.length > 0 && games[0].isWinner) {
    highlights.push('Best Win');
  }
  
  let narrative = '';
  
  console.log(`[Tamil Insights] Generating insights for ${gameType} player (${summary.totalGames} games)...`);
  
  if (gameType.toLowerCase() === 'rummy') {
    // Analyze round-by-round patterns for Rummy
    const roundPatterns = analyzeRoundPatterns(games, summary.userId);
    console.log(`[Tamil Insights] Analyzed ${roundPatterns.totalRoundsAnalyzed} rounds for patterns`);
    narrative = generateRummyInsights(summary, roundPatterns, summary.userId);
  } else {
    narrative = generateGenericInsights(summary, gameType);
  }
  
  console.log(`[Tamil Insights] ✓ Generated ${narrative.length} character Tamil analysis`);
  
  return { 
    insights: [narrative], 
    highlights,
    generatedBy: 'tamil-rule-based'
  };
}

// Generate Rummy-specific Tamil insights
function generateRummyInsights(summary, roundPatterns, userId) {
  const parts = [];
  
  // 0. UNIQUE TITLE - Stable, based on win rate tier
  const uniqueTitle = getUniqueTitle(summary, userId);
  parts.push(`"${uniqueTitle}"`); // Add quotes for emphasis
  
  // 1. Opening - Performance intro
  let intro = '';
  if (summary.winRate >= 50) {
    intro = pick(TAMIL_PHRASES.intros.champion);
  } else if (summary.winRate >= 35) {
    intro = pick(TAMIL_PHRASES.intros.strong);
  } else if (summary.winRate >= 20) {
    intro = pick(TAMIL_PHRASES.intros.decent);
  } else if (summary.winRate >= 10) {
    intro = pick(TAMIL_PHRASES.intros.struggling);
  } else {
    intro = pick(TAMIL_PHRASES.intros.beginner);
  }
  parts.push(intro);
  
  // 2. Playing style based on drop rate
  let style = '';
  if (summary.dropRate <= 15) {
    style = pick(TAMIL_PHRASES.styles.aggressive) + ' ' + pick(TAMIL_PHRASES.dropStyle.neverDrops);
  } else if (summary.dropRate <= 25) {
    style = pick(TAMIL_PHRASES.styles.aggressive) + ' ' + pick(TAMIL_PHRASES.dropStyle.lowDrop);
  } else if (summary.dropRate <= 35) {
    style = pick(TAMIL_PHRASES.styles.balanced) + ' ' + pick(TAMIL_PHRASES.dropStyle.balanced);
  } else if (summary.dropRate <= 45) {
    style = pick(TAMIL_PHRASES.styles.cautious) + ' ' + pick(TAMIL_PHRASES.dropStyle.frequent);
  } else {
    style = pick(TAMIL_PHRASES.styles.cautious) + ' ' + pick(TAMIL_PHRASES.dropStyle.excessive);
  }
  parts.push(style);
  
  // 3. Win rate commentary
  let winComment = '';
  if (summary.winRate >= 45) {
    winComment = pick(TAMIL_PHRASES.winRate.dominating);
  } else if (summary.winRate >= 35) {
    winComment = pick(TAMIL_PHRASES.winRate.good);
  } else if (summary.winRate >= 20) {
    winComment = pick(TAMIL_PHRASES.winRate.moderate);
  } else if (summary.winRate >= 10) {
    winComment = pick(TAMIL_PHRASES.winRate.low);
  } else {
    winComment = pick(TAMIL_PHRASES.winRate.rare);
  }
  parts.push(winComment);
  
  // 4. Finals performance
  let finalsComment = '';
  if (summary.finalsRate >= 60) {
    finalsComment = pick(TAMIL_PHRASES.finals.master);
  } else if (summary.finalsRate >= 40) {
    finalsComment = pick(TAMIL_PHRASES.finals.good);
  } else if (summary.finalsRate >= 25) {
    finalsComment = pick(TAMIL_PHRASES.finals.moderate);
  } else {
    finalsComment = pick(TAMIL_PHRASES.finals.poor);
  }
  parts.push(finalsComment);
  
  // 5. Round performance
  let roundComment = '';
  if (summary.roundWinRate >= 30) {
    roundComment = pick(TAMIL_PHRASES.rounds.champion);
  } else if (summary.roundWinRate >= 20) {
    roundComment = pick(TAMIL_PHRASES.rounds.good);
  } else if (summary.roundWinRate >= 12) {
    roundComment = pick(TAMIL_PHRASES.rounds.average);
  } else {
    roundComment = pick(TAMIL_PHRASES.rounds.poor);
  }
  parts.push(roundComment);
  
  // 6. Points control
  let pointsComment = '';
  if (summary.avgPointsPerRound <= 18) {
    pointsComment = pick(TAMIL_PHRASES.points.excellent);
  } else if (summary.avgPointsPerRound <= 25) {
    pointsComment = pick(TAMIL_PHRASES.points.good);
  } else if (summary.avgPointsPerRound <= 32) {
    pointsComment = pick(TAMIL_PHRASES.points.average);
  } else if (summary.avgPointsPerRound <= 40) {
    pointsComment = pick(TAMIL_PHRASES.points.poor);
  } else {
    pointsComment = pick(TAMIL_PHRASES.points.terrible);
  }
  parts.push(pointsComment);
  
  // 7. Recent form/momentum
  let momentumComment = '';
  const formDiff = summary.recentForm.winRate - summary.winRate;
  if (formDiff >= 15) {
    momentumComment = pick(TAMIL_PHRASES.momentum.hot);
  } else if (formDiff >= 5) {
    momentumComment = pick(TAMIL_PHRASES.momentum.improving);
  } else if (formDiff >= -5) {
    momentumComment = pick(TAMIL_PHRASES.momentum.steady);
  } else if (formDiff >= -15) {
    momentumComment = pick(TAMIL_PHRASES.momentum.declining);
  } else {
    momentumComment = pick(TAMIL_PHRASES.momentum.cold);
  }
  parts.push(momentumComment);
  
  // 8. Round-by-round behavior patterns (NEW!)
  if (roundPatterns && roundPatterns.totalRoundsAnalyzed > 10) {
    // Drop timing pattern
    const { early, mid, late } = roundPatterns.dropTiming;
    if (early > 50) {
      parts.push(pick(TAMIL_PHRASES.dropTiming.firstRound));
    } else if (mid > 50) {
      parts.push(pick(TAMIL_PHRASES.dropTiming.midGame));
    } else if (late > 50) {
      parts.push(pick(TAMIL_PHRASES.dropTiming.lateGame));
    } else if (early > 20 && mid > 20 && late > 20) {
      parts.push(pick(TAMIL_PHRASES.dropTiming.balanced));
    }
    
    // Score variability pattern
    if (roundPatterns.scoreVariability > 25) {
      parts.push(pick(TAMIL_PHRASES.scorePatterns.volatile));
    } else if (roundPatterns.avgRoundScore <= 15) {
      parts.push(pick(TAMIL_PHRASES.scorePatterns.lowScorer));
    } else if (roundPatterns.avgRoundScore <= 25) {
      parts.push(pick(TAMIL_PHRASES.scorePatterns.moderateScorer));
    } else {
      parts.push(pick(TAMIL_PHRASES.scorePatterns.highScorer));
    }
  }
  
  // 9. Advice (pick most relevant)
  const advice = [];
  if (summary.dropRate <= 10 && summary.avgPointsPerRound > 30) {
    advice.push(pick(TAMIL_PHRASES.advice.dropMore));
  }
  if (summary.dropRate >= 45) {
    advice.push(pick(TAMIL_PHRASES.advice.dropLess));
  }
  if (summary.finalsRate < 30 && summary.dropRate < 30) {
    advice.push(pick(TAMIL_PHRASES.advice.finalsStrategy));
  }
  if (summary.avgPointsPerRound > 35) {
    advice.push(pick(TAMIL_PHRASES.advice.pointControl));
  }
  if (summary.roundWinRate < 15 && summary.dropRate < 30) {
    advice.push(pick(TAMIL_PHRASES.advice.roundStrategy));
  }
  
  if (advice.length === 0) {
    advice.push(pick(TAMIL_PHRASES.advice.general));
  }
  
  parts.push(advice[0]);
  
  // Join all parts into narrative
  return parts.join(' ');
}

// Generate generic game Tamil insights
function generateGenericInsights(summary, gameType) {
  const parts = [];
  
  // 1. Performance intro
  let intro = '';
  if (summary.winRate >= 50) {
    intro = pick(TAMIL_PHRASES.intros.champion);
  } else if (summary.winRate >= 35) {
    intro = pick(TAMIL_PHRASES.intros.strong);
  } else if (summary.winRate >= 20) {
    intro = pick(TAMIL_PHRASES.intros.decent);
  } else if (summary.winRate >= 10) {
    intro = pick(TAMIL_PHRASES.intros.struggling);
  } else {
    intro = pick(TAMIL_PHRASES.intros.beginner);
  }
  parts.push(intro);
  
  // 2. Win rate
  let winComment = '';
  if (summary.winRate >= 45) {
    winComment = pick(TAMIL_PHRASES.winRate.dominating);
  } else if (summary.winRate >= 30) {
    winComment = pick(TAMIL_PHRASES.winRate.good);
  } else if (summary.winRate >= 15) {
    winComment = pick(TAMIL_PHRASES.winRate.moderate);
  } else if (summary.winRate >= 5) {
    winComment = pick(TAMIL_PHRASES.winRate.low);
  } else {
    winComment = pick(TAMIL_PHRASES.winRate.rare);
  }
  parts.push(winComment);
  
  // 3. Recent form
  let momentumComment = '';
  const formDiff = summary.recentForm.winRate - summary.winRate;
  if (formDiff >= 15) {
    momentumComment = pick(TAMIL_PHRASES.momentum.hot);
  } else if (formDiff >= 5) {
    momentumComment = pick(TAMIL_PHRASES.momentum.improving);
  } else if (formDiff >= -5) {
    momentumComment = pick(TAMIL_PHRASES.momentum.steady);
  } else if (formDiff >= -15) {
    momentumComment = pick(TAMIL_PHRASES.momentum.declining);
  } else {
    momentumComment = pick(TAMIL_PHRASES.momentum.cold);
  }
  parts.push(momentumComment);
  
  // 4. Experience
  let expComment = '';
  if (summary.totalGames >= 50) {
    expComment = pick(TAMIL_PHRASES.experience.veteran);
  } else if (summary.totalGames >= 20) {
    expComment = pick(TAMIL_PHRASES.experience.experienced);
  } else if (summary.totalGames >= 8) {
    expComment = pick(TAMIL_PHRASES.experience.intermediate);
  } else {
    expComment = pick(TAMIL_PHRASES.experience.newbie);
  }
  parts.push(expComment);
  
  // 5. Advice
  parts.push(pick(TAMIL_PHRASES.advice.general));
  
  return parts.join(' ');
}

// GET AI-powered insights for a player
export async function GET(request, { params }) {
  try {
    const { userId } = params;
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('gameType') || 'Rummy';
    
    const games = await getGames();
    const player = await getUserById(userId);
    
    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }
    
    // Filter games by type and where player participated
    const playerGames = games.filter(g => 
      g.type.toLowerCase() === gameType.toLowerCase() && 
      g.players.some(p => p.id === userId) &&
      g.status === 'completed'
    );
    
    if (playerGames.length === 0) {
      return NextResponse.json({
        player: {
          id: player.id,
          name: player.name,
          profilePhoto: player.profilePhoto
        },
        gameType,
        insights: [`Welcome to ${gameType}! Start playing to get personalized insights about your game.`],
        highlights: [],
        summary: null
      });
    }
    
    // Sort by date (newest first)
    const sortedGames = playerGames.sort((a, b) => 
      new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt)
    );
    
    // Calculate summary stats
    const totalGames = sortedGames.length;
    const wins = sortedGames.filter(g => {
      const isWinner = g.winner === userId || (g.winners && g.winners.includes(userId));
      return isWinner;
    }).length;
    
    let finals = 0;
    let totalRoundsPlayed = 0;
    let totalRoundsWon = 0;
    let totalDrops = 0;
    let totalPointsScored = 0;
    
    sortedGames.forEach(game => {
      const playerInGame = game.players.find(p => p.id === userId);
      
      // Check finals
      if (gameType.toLowerCase() === 'rummy' && game.rounds && game.rounds.length > 0 && game.winner) {
        const lastRound = game.rounds[game.rounds.length - 1];
        if (lastRound.scores && (lastRound.scores[userId] !== 0 || !playerInGame?.isLost)) {
          finals++;
        }
      }
      
      // Count rounds
      if (game.rounds) {
        game.rounds.forEach(round => {
          if (round.scores && round.scores[userId] !== undefined) {
            const isDropped = (round.drops && round.drops[userId]) || (round.doubleDrops && round.doubleDrops[userId]);
            if (!isDropped) {
              totalRoundsPlayed++;
            }
            if (isDropped) {
              totalDrops++;
            }
            if (round.winners && round.winners[userId]) {
              totalRoundsWon++;
            }
            totalPointsScored += round.scores[userId] || 0;
          }
        });
      }
    });
    
    const recentGames = sortedGames.slice(0, 10);
    const recentWins = recentGames.filter(g => {
      const isWinner = g.winner === userId || (g.winners && g.winners.includes(userId));
      return isWinner;
    }).length;
    
    const summary = {
      userId,
      totalGames,
      wins,
      winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
      finals,
      finalsRate: totalGames > 0 ? Math.round((finals / totalGames) * 100) : 0,
      totalRoundsPlayed,
      totalRoundsWon,
      totalRounds: totalRoundsPlayed + totalDrops,
      roundWinRate: totalRoundsPlayed > 0 ? Math.round((totalRoundsWon / totalRoundsPlayed) * 100) : 0,
      totalDrops,
      dropRate: (totalRoundsPlayed + totalDrops) > 0 ? Math.round((totalDrops / (totalRoundsPlayed + totalDrops)) * 100) : 0,
      avgPointsPerRound: totalRoundsPlayed > 0 ? Math.round(totalPointsScored / totalRoundsPlayed) : 0,
      recentForm: {
        last10Games: recentGames.length,
        wins: recentWins,
        winRate: recentGames.length > 0 ? Math.round((recentWins / recentGames.length) * 100) : 0
      }
    };
    
    // Sort games by total points for best/worst
    const gamesByPoints = [...sortedGames].sort((a, b) => {
      const aPlayer = a.players.find(p => p.id === userId);
      const bPlayer = b.players.find(p => p.id === userId);
      return (aPlayer?.totalPoints || 0) - (bPlayer?.totalPoints || 0);
    });
    
    const { insights, highlights, generatedBy } = await generateInsights(summary, gamesByPoints, gameType);
    
    return NextResponse.json({
      player: {
        id: player.id,
        name: player.name,
        profilePhoto: player.profilePhoto
      },
      gameType,
      insights,
      highlights,
      summary,
      generatedBy // 'tamil-rule-based'
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Error generating player insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}


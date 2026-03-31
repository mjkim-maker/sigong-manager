/**
 * 시공관리 플랫폼 — Firebase 연동 공통 데이터 레이어
 * 모든 기기에서 실시간 동기화
 */

// Firebase SDK (CDN 버전용 — 전역 변수 사용)
const firebaseConfig = {
    apiKey: "AIzaSyDYxga3vCyoGh-5tCut6XMwl7kyys4tmbc",
    authDomain: "sigong-manager.firebaseapp.com",
    databaseURL: "https://sigong-manager-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "sigong-manager",
    storageBucket: "sigong-manager.firebasestorage.app",
    messagingSenderId: "617085513185",
    appId: "1:617085513185:web:dc8995207bea22595276a0"
};

let firebaseApp, firebaseDb;

function initFirebase() {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firebaseDb = firebase.database();
}

// ===== DB Layer =====
const DB = {
    _cache: {},
    _listeners: {},
    _ready: false,
    _readyCallbacks: [],

    init() {
        initFirebase();
        // Load all collections and listen for changes
        const collections = ['accounts','companies','workers','jobs','asTickets','feedback','notifications'];
        let loaded = 0;
        collections.forEach(key => {
            const ref = firebaseDb.ref(key);
            ref.on('value', (snap) => {
                const data = snap.val();
                this._cache[key] = data ? Object.values(data) : [];
                // Notify listeners
                (this._listeners[key] || []).forEach(fn => fn('sync', null));
                loaded++;
                if (loaded >= collections.length && !this._ready) {
                    this._ready = true;
                    this._readyCallbacks.forEach(fn => fn());
                }
            });
        });
    },

    onReady(fn) {
        if (this._ready) fn();
        else this._readyCallbacks.push(fn);
    },

    // Initialize default data if DB is empty
    async seedIfEmpty() {
        const snap = await firebaseDb.ref('accounts').once('value');
        if (snap.exists()) return; // Already has data
        console.log('Seeding initial data...');
        await firebaseDb.ref('accounts').set(this._arrayToObj(DEFAULT_ACCOUNTS));
        await firebaseDb.ref('companies').set(this._arrayToObj(DEFAULT_COMPANIES));
        await firebaseDb.ref('workers').set(this._arrayToObj(DEFAULT_WORKERS));
        await firebaseDb.ref('jobs').set(this._arrayToObj(DEFAULT_JOBS));
        await firebaseDb.ref('asTickets').set(this._arrayToObj(DEFAULT_AS));
        await firebaseDb.ref('feedback').set(this._arrayToObj(DEFAULT_FEEDBACK));
        await firebaseDb.ref('notifications').set(this._arrayToObj(DEFAULT_NOTIFICATIONS));
        console.log('Seed complete.');
    },

    _arrayToObj(arr) {
        const obj = {};
        arr.forEach(item => { obj[item.id] = item; });
        return obj;
    },

    // CRUD
    getAll(key) { return this._cache[key] || []; },
    getById(key, id) { return (this._cache[key] || []).find(r => r.id === id); },

    add(key, record) {
        firebaseDb.ref(key + '/' + record.id).set(record);
        return record;
    },

    update(key, id, updates) {
        const existing = this.getById(key, id);
        if (!existing) return null;
        const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
        firebaseDb.ref(key + '/' + id).set(updated);
        return updated;
    },

    // Listen for changes
    onChange(key, fn) {
        if (!this._listeners[key]) this._listeners[key] = [];
        this._listeners[key].push(fn);
    },

    // Compat: listenSync (no-op, firebase handles it)
    listenSync(callback) {
        ['jobs','asTickets','feedback','notifications','companies'].forEach(key => {
            this.onChange(key, () => callback(key, 'sync', null));
        });
    },

    // ID generator
    genId(prefix) {
        const d = new Date();
        const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
        const rnd = String(Math.floor(Math.random()*1000)).padStart(3,'0');
        return `${prefix}-${ds}-${rnd}`;
    },

    // Force reseed
    async reset() {
        await firebaseDb.ref().remove();
        await this.seedIfEmpty();
    }
};

// ===== DEFAULT DATA (same as before) =====

const DEFAULT_ACCOUNTS = [
    { id:'acc-001', loginId:'admin', password:'admin123', name:'김관리', role:'admin', companyId:null, avatar:'AD' },
    { id:'acc-002', loginId:'first-cs', password:'first123', name:'박승현', role:'tech', companyId:'comp-001', avatar:'PS' },
    { id:'acc-003', loginId:'first-mgr', password:'first123', name:'이매니저', role:'tech-mgr', companyId:'comp-001', avatar:'IM' },
    { id:'acc-004', loginId:'juwon', password:'juwon123', name:'최대표', role:'tech', companyId:'comp-002', avatar:'CD' },
    { id:'acc-005', loginId:'daon', password:'daon123', name:'김대표', role:'tech', companyId:'comp-003', avatar:'KD' },
    { id:'acc-006', loginId:'worksite', password:'work123', name:'정대표', role:'tech', companyId:'comp-004', avatar:'JD' },
    { id:'acc-007', loginId:'grape', password:'grape123', name:'한대표', role:'tech', companyId:'comp-005', avatar:'HD' },
    { id:'acc-008', loginId:'samton', password:'sam123', name:'오대표', role:'tech', companyId:'comp-006', avatar:'OD' },
    { id:'acc-w01', loginId:'kim.th', password:'1234', name:'김태현', role:'worker', companyId:'comp-001', workerId:'w-001', avatar:'김' },
    { id:'acc-w02', loginId:'han.jh', password:'1234', name:'한지훈', role:'worker', companyId:'comp-001', workerId:'w-002', avatar:'한' },
    { id:'acc-w03', loginId:'cho.hb', password:'1234', name:'조현빈', role:'worker', companyId:'comp-001', workerId:'w-003', avatar:'조' },
    { id:'acc-w04', loginId:'moon.gw', password:'1234', name:'문건우', role:'worker', companyId:'comp-001', workerId:'w-004', avatar:'문' },
    { id:'acc-w05', loginId:'park.yh', password:'1234', name:'박영호', role:'worker', companyId:'comp-001', workerId:'w-005', avatar:'박' },
    { id:'acc-w06', loginId:'lee.sm', password:'1234', name:'이수민', role:'worker', companyId:'comp-001', workerId:'w-006', avatar:'이' },
];

const DEFAULT_COMPANIES = [
    { id:'comp-001', name:'퍼스트씨에스', region:'서울/경기', cats:['에어컨','설비'], contact:'02-1234-5678', ceo:'박승현', contractStart:'2024-06-15', contractEnd:'2026-06-14', unitPrice:{'에어컨':180000,'설비':150000}, settleCycle:'월2회(15일,말일)', penalty:50000, status:'active', privacy:{showCustomerName:true, showCustomerPhone:false} },
    { id:'comp-002', name:'주원씨앤아이', region:'서울/경기', cats:['창호','중문'], contact:'02-2345-6789', ceo:'최대표', contractStart:'2024-08-01', contractEnd:'2026-07-31', unitPrice:{'창호':220000,'중문':280000}, settleCycle:'월1회(말일)', penalty:40000, status:'active', privacy:{showCustomerName:true, showCustomerPhone:false} },
    { id:'comp-003', name:'다온이엔지', region:'수도권', cats:['마루','바닥재'], contact:'031-345-6789', ceo:'김대표', contractStart:'2024-09-01', contractEnd:'2026-08-31', unitPrice:{'마루':120000,'바닥재':95000}, settleCycle:'월2회', penalty:30000, status:'active', privacy:{showCustomerName:true, showCustomerPhone:false} },
    { id:'comp-004', name:'워크사이트', region:'서울/경기', cats:['도배','벽지'], contact:'02-3456-7890', ceo:'정대표', contractStart:'2024-07-01', contractEnd:'2026-06-30', unitPrice:{'도배':80000,'벽지':80000}, settleCycle:'월1회', penalty:30000, status:'active', privacy:{showCustomerName:true, showCustomerPhone:false} },
    { id:'comp-005', name:'그레이프시스템', region:'전국', cats:['에어컨'], contact:'02-4567-8901', ceo:'한대표', contractStart:'2025-01-01', contractEnd:'2026-12-31', unitPrice:{'에어컨':175000}, settleCycle:'월2회', penalty:50000, status:'active', privacy:{showCustomerName:true, showCustomerPhone:false} },
    { id:'comp-006', name:'삼통기업', region:'서울/경기', cats:['마루'], contact:'02-5678-9012', ceo:'오대표', contractStart:'2024-10-01', contractEnd:'2026-09-30', unitPrice:{'마루':110000}, settleCycle:'월1회', penalty:30000, status:'active', privacy:{showCustomerName:true, showCustomerPhone:false} },
    { id:'comp-007', name:'공간씨엔에스', region:'수도권', cats:['마루','타일'], contact:'031-678-9012', ceo:'강대표', contractStart:'2025-02-01', contractEnd:'2027-01-31', unitPrice:{'마루':115000,'타일':130000}, settleCycle:'월1회', penalty:30000, status:'active', privacy:{showCustomerName:true, showCustomerPhone:false} },
    { id:'comp-008', name:'잘하시공', region:'전국', cats:['설비','욕실'], contact:'02-789-0123', ceo:'윤대표', contractStart:'2024-11-01', contractEnd:'2026-10-31', unitPrice:{'설비':145000,'욕실':160000}, settleCycle:'월2회', penalty:40000, status:'active', privacy:{showCustomerName:true, showCustomerPhone:false} },
    { id:'comp-009', name:'도담인테리어', region:'경기', cats:['마루','바닥재'], contact:'031-890-1234', ceo:'배대표', contractStart:'2025-03-01', contractEnd:'2027-02-28', unitPrice:{'마루':115000,'바닥재':90000}, settleCycle:'월1회', penalty:30000, status:'active', privacy:{showCustomerName:true, showCustomerPhone:false} },
    { id:'comp-010', name:'원탑상재', region:'서울', cats:['마루'], contact:'02-901-2345', ceo:'남대표', contractStart:'2025-01-15', contractEnd:'2026-12-31', unitPrice:{'마루':108000}, settleCycle:'월1회', penalty:25000, status:'active', privacy:{showCustomerName:true, showCustomerPhone:false} },
    { id:'comp-011', name:'한빛설비', region:'경기/인천', cats:['설비','철거'], contact:'032-012-3456', ceo:'유대표', contractStart:'2024-12-01', contractEnd:'2026-11-30', unitPrice:{'설비':140000,'철거':100000}, settleCycle:'월1회', penalty:30000, status:'inactive', privacy:{showCustomerName:true, showCustomerPhone:false} },
    { id:'comp-012', name:'세종시공', region:'충청', cats:['타일','욕실'], contact:'044-123-4567', ceo:'고대표', contractStart:'2024-05-15', contractEnd:'2026-05-14', unitPrice:{'타일':125000,'욕실':155000}, settleCycle:'월1회', penalty:25000, status:'active', privacy:{showCustomerName:true, showCustomerPhone:false} },
];

const DEFAULT_WORKERS = [
    { id:'w-001', companyId:'comp-001', name:'김태현', phone:'010-1234-5678', skill:'에어컨/설비', area:'강남/서초/송파', status:'active', certs:[{name:'냉동기능사',no:'NF-2022-1234',expiry:'2027-08-15'}], rating:4.5 },
    { id:'w-002', companyId:'comp-001', name:'한지훈', phone:'010-2345-6789', skill:'에어컨/설비', area:'성남/분당/용인', status:'active', certs:[{name:'냉동기능사',no:'NF-2021-5678',expiry:'2026-04-15'}], rating:4.3 },
    { id:'w-003', companyId:'comp-001', name:'조현빈', phone:'010-3456-7890', skill:'에어컨', area:'서초/반포/방배', status:'active', certs:[{name:'냉동기능사',no:'NF-2023-9012',expiry:'2028-02-20'}], rating:4.4 },
    { id:'w-004', companyId:'comp-001', name:'문건우', phone:'010-4567-8901', skill:'에어컨', area:'송파/잠실/강동', status:'active', certs:[{name:'냉동기능사',no:'NF-2022-3456',expiry:'2027-11-30'}], rating:4.1 },
    { id:'w-005', companyId:'comp-001', name:'박영호', phone:'010-5678-9012', skill:'설비', area:'용인/수지/기흥', status:'active', certs:[{name:'배관기능사',no:'PL-2020-7890',expiry:'2026-04-22'}], rating:3.9 },
    { id:'w-006', companyId:'comp-001', name:'이수민', phone:'010-6789-0123', skill:'에어컨', area:'마포/상암/합정', status:'active', certs:[{name:'냉동기능사',no:'NF-2023-1234',expiry:'2028-06-10'}], rating:4.6 },
    { id:'w-007', companyId:'comp-001', name:'정현우', phone:'010-7890-1234', skill:'에어컨/설비', area:'화성/동탄/오산', status:'active', certs:[{name:'냉동기능사',no:'NF-2022-5678',expiry:'2027-09-05'},{name:'배관기능사',no:'PL-2021-1234',expiry:'2027-03-20'}], rating:4.2 },
    { id:'w-008', companyId:'comp-001', name:'최동혁', phone:'010-8901-2345', skill:'설비', area:'고양/일산/파주', status:'active', certs:[{name:'배관기능사',no:'PL-2019-9012',expiry:'2026-04-22'}], rating:3.8 },
    { id:'w-009', companyId:'comp-001', name:'강민수', phone:'010-9012-3456', skill:'에어컨', area:'관악/신림/구로', status:'active', certs:[{name:'냉동기능사',no:'NF-2023-7890',expiry:'2028-01-15'}], rating:4.3 },
    { id:'w-010', companyId:'comp-001', name:'윤재호', phone:'010-0123-4567', skill:'에어컨', area:'노원/도봉/강북', status:'active', certs:[{name:'냉동기능사',no:'NF-2022-0123',expiry:'2027-07-25'}], rating:4.1 },
    { id:'w-011', companyId:'comp-002', name:'이상훈', phone:'010-1111-2222', skill:'창호', area:'서울 전역', status:'active', certs:[{name:'유리시공기능사',no:'GL-2022-001',expiry:'2027-05-10'}], rating:4.4 },
    { id:'w-012', companyId:'comp-002', name:'김도현', phone:'010-1111-3333', skill:'창호/중문', area:'경기 서부', status:'active', certs:[{name:'유리시공기능사',no:'GL-2021-002',expiry:'2026-08-20'}], rating:4.2 },
    { id:'w-013', companyId:'comp-003', name:'송민재', phone:'010-2222-4444', skill:'마루', area:'수도권', status:'active', certs:[{name:'목공기능사',no:'WD-2023-001',expiry:'2028-03-15'}], rating:4.5 },
    { id:'w-014', companyId:'comp-004', name:'권도윤', phone:'010-3333-5555', skill:'도배', area:'서울/경기', status:'active', certs:[{name:'도배기능사',no:'WL-2022-001',expiry:'2027-09-30'}], rating:4.0 },
    { id:'w-015', companyId:'comp-005', name:'황도현', phone:'010-4444-6666', skill:'에어컨', area:'전국', status:'active', certs:[{name:'냉동기능사',no:'NF-2023-555',expiry:'2028-04-20'}], rating:4.6 },
];

// Jobs generator (same realistic data)
const DEFAULT_JOBS = (() => {
    const jobs = [];
    const p = (b,d,a) => ({before:b,during:d,after:a});
    const addrs = ['서울 강남구 역삼동','서울 서초구 반포동','서울 송파구 잠실동','경기 성남시 분당구','경기 용인시 수지구','서울 마포구 상암동','경기 화성시 동탄','서울 강서구 마곡동','서울 용산구 이태원','경기 고양시 일산','서울 영등포구 여의도','서울 노원구 상계동','인천 남동구 구월동','경기 수원시 영통구','서울 관악구 신림동','서울 강동구 천호동','경기 파주시 운정','서울 종로구 부암동','경기 안양시 동안구','서울 동작구 사당동'];
    const names = ['김OO','이OO','박OO','최OO','정OO','강OO','조OO','윤OO','장OO','임OO','한OO','오OO','서OO','신OO','권OO','황OO','안OO','송OO','류OO','전OO'];
    const types_ac = ['시스템에어컨 설치','벽걸이에어컨 설치','에어컨 이전설치','에어컨 철거','에어컨 점검'];
    const types_pl = ['보일러 교체','배관 교체','보일러 점검','수전 교체','난방배관 시공'];
    let n=0;
    const mkPhone = () => `010-${String(1000+n).slice(-4)}-${String(1000+(n++*7)%9000).slice(-4)}`;
    const rAddr = () => addrs[Math.floor(Math.random()*addrs.length)];
    const rName = () => names[Math.floor(Math.random()*names.length)];
    const workers_001 = ['w-001','w-002','w-003','w-004','w-005','w-006','w-007','w-008','w-009','w-010'];
    const times = ['09:00','09:30','10:00','10:30','11:00','13:00','13:30','14:00','14:30','15:00','15:30','16:00'];
    const workdays = [2,3,4,5,6,9,10,11,12,13,16,17,18,19,20,23,24,25,26,27,30,31];
    let idx=0;
    // comp-001: 72 jobs
    workdays.forEach((day,di) => {
        const dStr=String(day).padStart(2,'0'),cnt=day===31?8:(di%3===0?4:3);
        for(let j=0;j<cnt;j++){
            idx++;const wid=workers_001[(idx-1)%10],isAC=Math.random()>.25,cat=isAC?'에어컨':'설비',type=isAC?types_ac[idx%5]:types_pl[idx%5],time=times[j%12],src=Math.random()>.6?'api':'self';
            let st,sa=null,ca=null,ph=p(0,0,0);
            if(day<31){st='done';sa=`2026-03-${dStr}T${time}:00`;ca=`2026-03-${dStr}T${String(+time.split(':')[0]+2).padStart(2,'0')}:${time.split(':')[1]}:00`;ph=p(2+Math.floor(Math.random()*2),1+Math.floor(Math.random()*2),2+Math.floor(Math.random()*3));}
            else if(j<3){st='done';sa=`2026-03-31T${time}:00`;ca=`2026-03-31T${String(+time.split(':')[0]+2).padStart(2,'0')}:${time.split(':')[1]}:00`;ph=p(2,1,3);}
            else if(j<5){st='progress';sa=`2026-03-31T${time}:00`;ph=p(2,1,0);}
            else{st='waiting';}
            const isAS=day===31&&j===7;
            jobs.push({id:`S-2026-01-${String(idx).padStart(3,'0')}`,companyId:'comp-001',workerId:wid,date:`2026-03-${dStr}`,time,cat,type,addr:rAddr(),customer:rName(),phone:mkPhone(),source:src,extId:src==='api'?`OH-${String(1000+idx)}`:null,status:st,startedAt:sa,completedAt:ca,photos:ph,memo:isAS?'AS: 냉매 부족 의심':'',isAS:isAS||false,...(isAS?{asCode:'AC-01',asIssue:'냉매 부족',origJobId:'S-20260215-034'}:{}),createdAt:`2026-03-${String(Math.max(1,day-3)).padStart(2,'0')}T10:00:00`});
        }
    });
    // comp-002~012: simplified
    const others=[['comp-002','w-011','w-012',['창호','중문'],55],['comp-003','w-013',null,['마루','바닥재'],48],['comp-004','w-014',null,['도배','벽지'],38],['comp-005','w-015',null,['에어컨'],35],['comp-006',null,null,['마루'],22],['comp-007',null,null,['마루','타일'],18],['comp-008',null,null,['설비','욕실'],15],['comp-009',null,null,['마루','바닥재'],12],['comp-010',null,null,['마루'],10],['comp-011',null,null,['설비','철거'],8],['comp-012',null,null,['타일','욕실'],6]];
    others.forEach(([cid,w1,w2,cats,cnt])=>{
        for(let i=0;i<cnt;i++){
            const day=workdays[i%workdays.length],dStr=String(day).padStart(2,'0'),isDone=i<Math.round(cnt*.9),cat=cats[i%cats.length];
            idx++;
            jobs.push({id:`S-2026-${cid.slice(-2)}-${String(i+1).padStart(3,'0')}`,companyId:cid,workerId:w1||(i%2===0?w1:w2),date:`2026-03-${dStr}`,time:times[i%6],cat,type:cat+' 시공',addr:rAddr(),customer:rName(),phone:mkPhone(),source:i%3===0?'api':'self',extId:i%3===0?`OH-${cid.slice(-2)}${i}`:null,status:isDone?'done':'waiting',startedAt:isDone?`2026-03-${dStr}T09:00:00`:null,completedAt:isDone?`2026-03-${dStr}T14:00:00`:null,photos:isDone?p(2,1,3):p(0,0,0),memo:'',createdAt:`2026-03-${String(Math.max(1,day-2)).padStart(2,'0')}T10:00:00`});
        }
    });
    return jobs;
})();

const DEFAULT_AS = [
    { id:'AS-0087', companyId:'comp-001', origJobId:'S-2026-01-015', workerId:'w-002', date:'2026-03-25', cat:'에어컨', code:'AC-01', issue:'냉매 부족 재점검', customer:'이OO', phone:'010-9999-0001', status:'open', visitDate:null, resolution:null, createdAt:'2026-03-25T10:00:00' },
    { id:'AS-0086', companyId:'comp-001', origJobId:'S-2026-01-008', workerId:'w-008', date:'2026-03-20', cat:'설비', code:'PL-02', issue:'배관 연결부 미세 누수', customer:'김OO', phone:'010-9999-0002', status:'resolved', visitDate:'2026-03-22', resolution:'조인트 재시공', createdAt:'2026-03-20T14:00:00' },
    { id:'AS-0085', companyId:'comp-001', origJobId:'S-2026-01-003', workerId:'w-005', date:'2026-03-15', cat:'에어컨', code:'AC-04', issue:'리모컨 페어링 불량', customer:'박OO', phone:'010-9999-0003', status:'resolved', visitDate:'2026-03-17', resolution:'리모컨 교체', createdAt:'2026-03-15T09:00:00' },
    { id:'AS-0084', companyId:'comp-002', origJobId:'S-2026-02-012', workerId:'w-011', date:'2026-03-28', cat:'창호', code:'WD-02', issue:'창호 잠금장치 불량', customer:'이OO', phone:'010-9999-0005', status:'open', visitDate:null, resolution:null, createdAt:'2026-03-28T15:00:00' },
    { id:'AS-0083', companyId:'comp-002', origJobId:'S-2026-02-005', workerId:'w-012', date:'2026-03-18', cat:'중문', code:'DR-01', issue:'레일 소음', customer:'김OO', phone:'010-9999-0006', status:'resolved', visitDate:'2026-03-20', resolution:'레일 윤활', createdAt:'2026-03-18T10:00:00' },
    { id:'AS-0082', companyId:'comp-003', origJobId:'S-2026-03-008', workerId:'w-013', date:'2026-03-27', cat:'마루', code:'FL-01', issue:'마루 들뜸', customer:'박OO', phone:'010-9999-0007', status:'open', visitDate:null, resolution:null, createdAt:'2026-03-27T09:00:00' },
    { id:'AS-0081', companyId:'comp-003', origJobId:'S-2026-03-003', workerId:'w-013', date:'2026-03-12', cat:'마루', code:'FL-04', issue:'마루 소음', customer:'조OO', phone:'010-9999-0008', status:'resolved', visitDate:'2026-03-14', resolution:'하부 보강', createdAt:'2026-03-12T11:00:00' },
    { id:'AS-0080', companyId:'comp-004', origJobId:'S-2026-04-010', workerId:'w-014', date:'2026-03-26', cat:'도배', code:'WP-01', issue:'벽지 이음새 벌어짐', customer:'최OO', phone:'010-9999-0009', status:'in_progress', visitDate:'2026-03-29', resolution:null, createdAt:'2026-03-26T11:00:00' },
    { id:'AS-0079', companyId:'comp-005', origJobId:'S-2026-05-015', workerId:'w-015', date:'2026-03-22', cat:'에어컨', code:'AC-02', issue:'실외기 소음', customer:'한OO', phone:'010-9999-0010', status:'resolved', visitDate:'2026-03-24', resolution:'방진패드 교체', createdAt:'2026-03-22T14:00:00' },
    { id:'AS-0078', companyId:'comp-006', origJobId:'S-2026-06-005', workerId:null, date:'2026-03-23', cat:'마루', code:'FL-02', issue:'마루 긁힘', customer:'오OO', phone:'010-9999-0011', status:'resolved', visitDate:'2026-03-25', resolution:'부분 보수', createdAt:'2026-03-23T10:00:00' },
    { id:'AS-0077', companyId:'comp-007', origJobId:'S-2026-07-003', workerId:null, date:'2026-03-20', cat:'타일', code:'TL-01', issue:'타일 균열', customer:'강OO', phone:'010-9999-0012', status:'resolved', visitDate:'2026-03-22', resolution:'타일 교체', createdAt:'2026-03-20T16:00:00' },
    { id:'AS-0076', companyId:'comp-011', origJobId:'S-2026-11-002', workerId:null, date:'2026-03-18', cat:'설비', code:'PL-01', issue:'보일러 이상음', customer:'유OO', phone:'010-9999-0013', status:'resolved', visitDate:'2026-03-20', resolution:'팬 모터 교체', createdAt:'2026-03-18T09:00:00' },
];

const DEFAULT_FEEDBACK = [
    { id:'fb-001', jobId:'S-2026-01-001', companyId:'comp-001', workerId:'w-001', rating:4, comment:'깔끔하게 잘 해주셨어요', createdAt:'2026-03-31T11:00:00' },
    { id:'fb-002', jobId:'S-2026-01-002', companyId:'comp-001', workerId:'w-002', rating:5, comment:'친절하고 꼼꼼합니다', createdAt:'2026-03-31T11:30:00' },
    { id:'fb-003', jobId:'S-2026-01-010', companyId:'comp-001', workerId:'w-001', rating:4, comment:'시간 약속 잘 지켜주셨어요', createdAt:'2026-03-30T11:00:00' },
    { id:'fb-004', jobId:'S-2026-01-011', companyId:'comp-001', workerId:'w-002', rating:3, comment:'시공은 괜찮은데 정리가 아쉬워요', createdAt:'2026-03-30T13:00:00' },
    { id:'fb-005', jobId:'S-2026-01-012', companyId:'comp-001', workerId:'w-003', rating:5, comment:'최고입니다!', createdAt:'2026-03-30T12:00:00' },
    { id:'fb-006', jobId:'S-2026-02-001', companyId:'comp-002', workerId:'w-011', rating:4, comment:'잘 해주셨습니다', createdAt:'2026-03-31T13:00:00' },
    { id:'fb-007', jobId:'S-2026-03-001', companyId:'comp-003', workerId:'w-013', rating:5, comment:'마루 시공 너무 만족합니다', createdAt:'2026-03-31T15:00:00' },
];

const DEFAULT_NOTIFICATIONS = [
    { id:'n-001', target:'w-001', type:'schedule', title:'내일 일정 3건', desc:'4월 1일 시공 3건 배정', read:false, createdAt:'2026-03-31T08:00:00' },
    { id:'n-002', target:'w-001', type:'feedback', title:'고객 평가 등록', desc:'이정훈 고객님이 별점 4점', read:false, createdAt:'2026-03-31T11:00:00' },
    { id:'n-003', target:'w-001', type:'as', title:'AS 건 배정', desc:'에어컨 AS 건 배정', read:false, createdAt:'2026-03-31T07:00:00' },
    { id:'n-004', target:'w-002', type:'cert', title:'자격증 만료 임박', desc:'냉동기능사 2026.04.15 만료', read:false, createdAt:'2026-03-30T09:00:00' },
    { id:'n-005', target:'comp-001', type:'alert', title:'자격증 만료 임박 2건', desc:'한지훈(04.15), 최동혁(04.22)', read:false, createdAt:'2026-03-31T08:00:00' },
    { id:'n-006', target:'admin', type:'alert', title:'한빛설비 완료율 저조', desc:'기준치(85%) 미달', read:false, createdAt:'2026-03-31T08:00:00' },
];

const AS_CODES = {
    '에어컨':[{code:'AC-01',name:'냉매 부족/누출'},{code:'AC-02',name:'실외기 소음'},{code:'AC-03',name:'배수 불량'},{code:'AC-04',name:'리모컨/통신 불량'},{code:'AC-05',name:'냉방 성능 저하'}],
    '설비':[{code:'PL-01',name:'보일러 이상음'},{code:'PL-02',name:'배관 누수'},{code:'PL-03',name:'온수 온도 이상'},{code:'PL-04',name:'난방 불균형'},{code:'PL-05',name:'수전 누수'}],
    '마루':[{code:'FL-01',name:'들뜸/부풀음'},{code:'FL-02',name:'긁힘/찍힘'},{code:'FL-03',name:'변색/얼룩'},{code:'FL-04',name:'소음(삐걱)'},{code:'FL-05',name:'이음새 벌어짐'}],
    '창호':[{code:'WD-01',name:'결로 발생'},{code:'WD-02',name:'잠금장치 불량'},{code:'WD-03',name:'기밀 불량'},{code:'WD-04',name:'유리 파손'},{code:'WD-05',name:'힌지 이상'}],
    '도배':[{code:'WP-01',name:'이음새 벌어짐'},{code:'WP-02',name:'기포 발생'},{code:'WP-03',name:'곰팡이'},{code:'WP-04',name:'탈색/변색'}],
    '벽지':[{code:'WP-01',name:'이음새 벌어짐'},{code:'WP-02',name:'기포 발생'},{code:'WP-03',name:'곰팡이'},{code:'WP-04',name:'탈색/변색'}],
    '타일':[{code:'TL-01',name:'균열/깨짐'},{code:'TL-02',name:'탈락'},{code:'TL-03',name:'줄눈 불량'},{code:'TL-04',name:'들뜸'}],
    '욕실':[{code:'BT-01',name:'수전 누수'},{code:'BT-02',name:'배수 불량'},{code:'BT-03',name:'변기 이상'},{code:'BT-04',name:'타일 균열'}],
    '중문':[{code:'DR-01',name:'레일 소음'},{code:'DR-02',name:'잠금 불량'},{code:'DR-03',name:'유리 파손'},{code:'DR-04',name:'처짐'}],
    '바닥재':[{code:'FL-01',name:'들뜸'},{code:'FL-02',name:'긁힘'},{code:'FL-03',name:'변색'},{code:'FL-04',name:'소음'}],
    '철거':[{code:'DM-01',name:'잔재물 미처리'},{code:'DM-02',name:'주변 손상'}],
};

const HELPERS = {
    formatDate(d) { if(!d)return'—';const dt=new Date(d);return`${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getDate()).padStart(2,'0')}`; },
    formatDateTime(d) { if(!d)return'—';const dt=new Date(d);return`${this.formatDate(d)} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`; },
    certStatus(exp) { const now=new Date(),e=new Date(exp),d=Math.floor((e-now)/(86400000));if(d<0)return{cls:'cert-expired',icon:'🚨',text:'만료',days:d};if(d<30)return{cls:'cert-danger',icon:'🚨',text:`D-${d}`,days:d};if(d<60)return{cls:'cert-warn',icon:'⚠️',text:`D-${d}`,days:d};return{cls:'cert-ok',icon:'✅',text:exp.substring(0,10),days:d}; },
    rateClass(r) { return r>=88?'up':r>=85?'':'down'; },
    asRateClass(r) { return r<=3?'up':r<=5?'warn':'down'; },
    starsHtml(r,sz) { sz=sz||'12px';const f=Math.round(r);return`<span class="stars" style="font-size:${sz}">${'★'.repeat(f)}<span class="empty">${'★'.repeat(5-f)}</span></span>`; },
    companyStats(cid) {
        const jobs=DB.getAll('jobs').filter(j=>j.companyId===cid),m=jobs.filter(j=>j.date?.startsWith('2026-03')),d=m.filter(j=>j.status==='done');
        const as=DB.getAll('asTickets').filter(a=>a.companyId===cid&&a.date?.startsWith('2026-03'));
        const ws=DB.getAll('workers').filter(w=>w.companyId===cid);
        const fb=DB.getAll('feedback').filter(f=>f.companyId===cid);
        const avg=fb.length?(fb.reduce((s,f)=>s+f.rating,0)/fb.length).toFixed(1):'—';
        return{workerCount:ws.length,monthlyJobs:m.length,monthlyDone:d.length,rate:m.length?Math.round(d.length/m.length*1000)/10:0,asOpen:as.filter(a=>a.status==='open').length,asTotal:as.length,asRate:m.length?Math.round(as.length/m.length*1000)/10:0,avgRating:avg};
    },
    totalStats() {
        const jobs=DB.getAll('jobs'),m=jobs.filter(j=>j.date?.startsWith('2026-03')),d=m.filter(j=>j.status==='done');
        const ws=DB.getAll('workers'),cs=DB.getAll('companies');
        const as=DB.getAll('asTickets').filter(a=>a.date?.startsWith('2026-03'));
        return{companyCount:cs.length,activeCompanies:cs.filter(c=>c.status==='active').length,workerCount:ws.length,monthlyJobs:m.length,monthlyDone:d.length,rate:m.length?Math.round(d.length/m.length*1000)/10:0,selfCount:m.filter(j=>j.source==='self').length,apiCount:m.filter(j=>j.source==='api').length,asOpen:as.filter(a=>a.status==='open').length,asTotal:as.length};
    },
    workerStats(wid) {
        const jobs=DB.getAll('jobs').filter(j=>j.workerId===wid&&j.date?.startsWith('2026-03')),d=jobs.filter(j=>j.status==='done');
        const as=DB.getAll('asTickets').filter(a=>a.workerId===wid&&a.date?.startsWith('2026-03'));
        const fb=DB.getAll('feedback').filter(f=>f.workerId===wid);
        const avg=fb.length?(fb.reduce((s,f)=>s+f.rating,0)/fb.length).toFixed(1):'—';
        return{monthlyJobs:jobs.length,monthlyDone:d.length,rate:jobs.length?Math.round(d.length/jobs.length*1000)/10:0,asCount:as.length,avgRating:avg};
    }
};

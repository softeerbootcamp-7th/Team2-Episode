MERGE INTO occupations (name) KEY (name) VALUES
('경영지원·사무'), ('영업·영업관리'), ('마케팅·광고·PR'), ('상품기획·MD·바이어'), 
('연구개발(R&D)'), ('IT·개발'), ('데이터·AI'), ('제품·서비스기획'), 
('생산·제조·품질'), ('건설·토목·설비'), ('구매·물류·SCM'), ('금융·보험·투자'), 
('디자인·크리에이티브'), ('미디어·콘텐츠·엔터테인먼트'), ('교육·이러닝'), 
('의료·헬스케어'), ('정부사업·공공'), ('고객상담·서비스·CS'), ('운전·운송·배송'), 
('식음료·외식'), ('스포츠·레저');

-- 경영지원·사무
MERGE INTO jobs (name, occupation_id) KEY (name) SELECT T.n, O.id FROM (
SELECT '경영기획·전략·사업기획' n UNION ALL SELECT '인사·HR·채용·HRD' UNION ALL SELECT '법무·컴플라이언스' UNION ALL SELECT '총무·사무·비서' UNION ALL SELECT '재무·회계·세무·IR' UNION ALL SELECT '감사·감사역' UNION ALL SELECT 'ESG·지속가능경영' UNION ALL SELECT '정책기획·기관기획'
) T JOIN occupations O ON O.name = '경영지원·사무';

-- 영업·영업관리
MERGE INTO jobs (name, occupation_id) KEY (name) SELECT T.n, O.id FROM (
SELECT '국내영업·B2B/B2C' n UNION ALL SELECT '해외영업·무역' UNION ALL SELECT '기술영업·영업기획·관리' UNION ALL SELECT '채널/대리점/지점관리' UNION ALL SELECT '매장영업관리'
) T JOIN occupations O ON O.name = '영업·영업관리';

-- 마케팅·광고·PR
MERGE INTO jobs (name, occupation_id) KEY (name) SELECT T.n, O.id FROM (
SELECT '브랜드마케팅·IMC·PR' n UNION ALL SELECT '디지털마케팅·퍼포먼스·그로스해킹' UNION ALL SELECT '시장조사·리서치' UNION ALL SELECT '광고기획·제작' UNION ALL SELECT '콘텐츠마케팅' UNION ALL SELECT 'SNS마케팅·인플루언서'
) T JOIN occupations O ON O.name = '마케팅·광고·PR';

-- 상품기획·MD·바이어
MERGE INTO jobs (name, occupation_id) KEY (name) SELECT T.n, O.id FROM (
SELECT '상품기획·MD' n UNION ALL SELECT '카테고리매니저' UNION ALL SELECT '바이어·소싱' UNION ALL SELECT 'PB상품개발' UNION ALL SELECT '트렌드분석' UNION ALL SELECT '브랜드매니저'
) T JOIN occupations O ON O.name = '상품기획·MD·바이어';

-- 연구개발(R&D)
MERGE INTO jobs (name, occupation_id) KEY (name) SELECT T.n, O.id FROM (
SELECT '기계·자동차 R&D' n UNION ALL SELECT '전기전자 R&D' UNION ALL SELECT '화학·소재 R&D' UNION ALL SELECT '바이오·의료 R&D' UNION ALL SELECT '반도체·디스플레이 R&D' UNION ALL SELECT 'SW·AI·알고리즘 R&D' UNION ALL SELECT '친환경·신재생에너지 R&D' UNION ALL SELECT '정책·경제연구'
) T JOIN occupations O ON O.name = '연구개발(R&D)';

-- IT·개발
MERGE INTO jobs (name, occupation_id) KEY (name) SELECT T.n, O.id FROM (
SELECT '백엔드·프론트엔드·풀스택' n UNION ALL SELECT '모바일·앱 개발' UNION ALL SELECT '게임개발' UNION ALL SELECT '시스템·네트워크·클라우드' UNION ALL SELECT '보안·해킹' UNION ALL SELECT 'DevOps·SRE' UNION ALL SELECT '블록체인·핀테크'
) T JOIN occupations O ON O.name = 'IT·개발';

-- 데이터·AI
MERGE INTO jobs (name, occupation_id) KEY (name) SELECT T.n, O.id FROM (
SELECT 'AI·ML·데이터사이언티스트' n UNION ALL SELECT '데이터엔지니어·분석가' UNION ALL SELECT '데이터아키텍트' UNION ALL SELECT 'MLOps엔지니어' UNION ALL SELECT '비즈니스인텔리전스(BI)'
) T JOIN occupations O ON O.name = '데이터·AI';

-- 제품·서비스기획
MERGE INTO jobs (name, occupation_id) KEY (name) SELECT T.n, O.id FROM (
SELECT '제품기획' n UNION ALL SELECT '서비스기획' UNION ALL SELECT 'BizOps·그로스' UNION ALL SELECT 'UX리서치·서비스분석' UNION ALL SELECT '테크니컬라이터'
) T JOIN occupations O ON O.name = '제품·서비스기획';

-- 생산·제조·품질
MERGE INTO jobs (name, occupation_id) KEY (name) SELECT T.n, O.id FROM (
SELECT '생산관리·공정관리·공장운영' n UNION ALL SELECT '생산기술·설비·보전' UNION ALL SELECT '품질관리(QC/QA)' UNION ALL SELECT '공정엔지니어' UNION ALL SELECT '스마트팩토리'
) T JOIN occupations O ON O.name = '생산·제조·품질';

-- 건설·토목·설비
MERGE INTO jobs (name, occupation_id) KEY (name) SELECT T.n, O.id FROM (
SELECT '건축·토목·플랜트 설계' n UNION ALL SELECT '현장시공·관리·공무' UNION ALL SELECT '안전관리·환경' UNION ALL SELECT '견적·원가·시공관리' UNION ALL SELECT '감리' UNION ALL SELECT '스마트시티·인프라'
) T JOIN occupations O ON O.name = '건설·토목·설비';

-- 구매·물류·SCM
MERGE INTO jobs (name, occupation_id) KEY (name) SELECT T.n, O.id FROM (
SELECT '구매·소싱·자재관리' n UNION ALL SELECT '물류·창고·운송관리' UNION ALL SELECT 'SCM·물류기획·공급망관리' UNION ALL SELECT '이커머스물류·풀필먼트'
) T JOIN occupations O ON O.name = '구매·물류·SCM';

-- 금융·보험·투자
MERGE INTO jobs (name, occupation_id) KEY (name) SELECT T.n, O.id FROM (
SELECT '은행원·텔러·여신·심사' n UNION ALL SELECT '증권·트레이더·애널리스트' UNION ALL SELECT '보험심사·손해사정·계리' UNION ALL SELECT '펀드매니저·리스크관리' UNION ALL SELECT '핀테크·디지털금융' UNION ALL SELECT '투자은행·기업금융·구조조정' UNION ALL SELECT '투자·VC·PE'
) T JOIN occupations O ON O.name = '금융·보험·투자';

-- 디자인·크리에이티브
MERGE INTO jobs (name, occupation_id) KEY (name) SELECT T.n, O.id FROM (
SELECT 'UX/UI·서비스디자인' n UNION ALL SELECT '그래픽·편집디자인' UNION ALL SELECT '제품디자인' UNION ALL SELECT '영상·모션그래픽·콘텐츠' UNION ALL SELECT '작가·시나리오' UNION ALL SELECT '브랜드디자인·패키지'
) T JOIN occupations O ON O.name = '디자인·크리에이티브';

-- 미디어·콘텐츠·엔터테인먼트
MERGE INTO jobs (name, occupation_id) KEY (name) SELECT T.n, O.id FROM (
SELECT '방송·영상제작' n UNION ALL SELECT '게임기획·운영' UNION ALL SELECT '웹툰·웹소설' UNION ALL SELECT '음악·엔터테인먼트' UNION ALL SELECT '콘텐츠크리에이터·MCN' UNION ALL SELECT 'OTT·스트리밍' UNION ALL SELECT '편집·기자·PD'
) T JOIN occupations O ON O.name = '미디어·콘텐츠·엔터테인먼트';

-- 교육·이러닝
MERGE INTO jobs (name, occupation_id) KEY (name) SELECT T.n, O.id FROM (
SELECT '교육기획·콘텐츠개발' n UNION ALL SELECT '강사·트레이너' UNION ALL SELECT '에듀테크·이러닝' UNION ALL SELECT '교육컨설팅' UNION ALL SELECT '기업교육·HRD'
) T JOIN occupations O ON O.name = '교육·이러닝';

-- 의료·헬스케어
MERGE INTO jobs (name, occupation_id) KEY (name) SELECT T.n, O.id FROM (
SELECT '임상시험·CRO' n UNION ALL SELECT '의료기기·제약' UNION ALL SELECT '헬스케어서비스' UNION ALL SELECT '디지털헬스·메드테크' UNION ALL SELECT '바이오인포매틱스'
) T JOIN occupations O ON O.name = '의료·헬스케어';

-- 정부사업·공공
MERGE INTO jobs (name, occupation_id) KEY (name) SELECT T.n, O.id FROM (
SELECT '정책기획·분석' n UNION ALL SELECT '공공사업·발주' UNION ALL SELECT '정부R&D관리·국제협력·ODA' UNION ALL SELECT '규제·인허가'
) T JOIN occupations O ON O.name = '정부사업·공공';

-- 고객상담·서비스·CS
MERGE INTO jobs (name, occupation_id) KEY (name) SELECT T.n, O.id FROM (
SELECT '콜센터·고객상담·TM' n UNION ALL SELECT 'VOC관리' UNION ALL SELECT '매장관리·점포운영' UNION ALL SELECT '호텔·항공·레저 서비스' UNION ALL SELECT '플랫폼운영' UNION ALL SELECT 'CX·고객경험'
) T JOIN occupations O ON O.name = '고객상담·서비스·CS';

-- 운전·운송·배송
MERGE INTO jobs (name, occupation_id) KEY (name) SELECT T.n, O.id FROM (
SELECT '택배·배송·기사' n UNION ALL SELECT '물류운전·포크레인·트럭' UNION ALL SELECT '항공·해운·크루즈' UNION ALL SELECT '모빌리티·차량공유'
) T JOIN occupations O ON O.name = '운전·운송·배송';

-- 식음료·외식
MERGE INTO jobs (name, occupation_id) KEY (name) SELECT T.n, O.id FROM (
SELECT '요리사·조리사' n UNION ALL SELECT '바리스타·베이커리' UNION ALL SELECT '식음료관리' UNION ALL SELECT '음식점운영' UNION ALL SELECT '푸드테크·배달플랫폼'
) T JOIN occupations O ON O.name = '식음료·외식';

-- 스포츠·레저
MERGE INTO jobs (name, occupation_id) KEY (name) SELECT T.n, O.id FROM (
SELECT '스포츠마케팅·매니지먼트' n UNION ALL SELECT '피트니스·헬스케어' UNION ALL SELECT '레저시설 운영' UNION ALL SELECT '스포츠콘텐츠·중계'
) T JOIN occupations O ON O.name = '스포츠·레저';

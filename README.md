# 수시 NAVI 판정 웹앱

경기도교육청 **2027 수시 NAVI(수시나비)** 엑셀 자료의 "학생 성적 입력 → 대학 판정" 기능을 웹앱으로 재현한 도구입니다. 학원·컨설팅 상담용.

> **출처:** 경기도교육청 「2027 수시 NAVI(수시나비)」. 본 웹앱은 해당 자료의 계산 로직과 데이터를 기반으로 합니다.

## 무엇을 하나

학생의 모의고사 백분위(국·수·탐구·영어등급)와 지역·계열을 입력하면, 6,368개 모집단위와 대조해 **차이값(학생 백분위 − 대학 70% 컷)** 으로 순위를 매기고 **안정/적정/소신/도전** 판정을 보여줍니다.

- 판정 계산은 원본 엑셀 수식(`점수계산기`, `검색` 시트)을 그대로 이식했습니다.
- **정확도 검증 완료**: 원본에 캐시된 계산값(백분위 635개 패턴 + 모집단위 6,368행 + 검색 결과 39행)을 골든 기준으로, 웹앱 계산이 오차 0.01 이내로 전부 일치함을 자동 테스트로 확인합니다.

## 로컬에서 실행

이 PC는 node/npm이 PATH에 없으므로 아래 경로를 먼저 잡아줍니다.

```bash
export PATH="/c/Users/user/AppData/Local/OpenAI/Codex/runtimes/cua_node/1b23c930bdf84ed6/bin:$PATH"
npm install
npm run dev      # 개발 서버 (http://localhost:5173)
npm test         # 정확도 테스트
npm run build    # 배포용 빌드 → dist/
```

## 데이터 갱신

원본 엑셀이 바뀌면 데이터만 다시 추출합니다(경로를 인자로 전달 가능).

```bash
python scripts/extract.py "원본.xlsx"
```

산출물: `public/data/`의 `moojib.json`, `calc_patterns.json`, `golden_calc.json`, `golden_search.json`.

## 배포 (GitHub Pages)

`main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 자동 빌드·배포합니다. 저장소 **Settings → Pages → Source = GitHub Actions** 설정 필요.

## 범위

- **1단계(현재):** 핵심 판정 엔진(검색·백분위·점수계산기).
- **이후:** 참고 데이터 탭(전형별·모집단위별·수능최저·전형일정 등) 추가 예정.

설계·계획 문서는 `docs/superpowers/`에 있습니다.

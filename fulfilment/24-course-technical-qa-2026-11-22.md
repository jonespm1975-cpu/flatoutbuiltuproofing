# Technical QA gate — 24 owner-approved roofing courses
**Review date:** 2026-11-22. **Disposition:** ON HOLD pending qualified independent/product review.

## Completed independent checks (no paid content exposed)
- Inspected the exact owner-approved JSON source (SHA-256 `f4f74aeb1562d3cf5ae1f7d93c3bb47b03d28dfb5282fd4812a045892d9f6014`), verified **24** unique IDs, **96** teaching stages and **72** quiz questions.
- Cross-checked general safety and construction-quality concepts against HSE roofwork and cutting guidance, NFRC Safe2Torch 2024, NHBC 2026 pitched-roof guidance, BSI BS 6229:2025, LRWA and MCRMA.
- Discovered severe answer-key bias: **70 of 72** original quiz answers were position B. An **owner-held** corrected JSON v1.1 has 24 correct answers in each of A/B/C without changing the correct answer itself.
- Discovered generic case-study model responses repeated across 24 courses and only 4 shared group-level learning outcomes. A **private** v1.1 candidate now contains 24 recommended course-specific outcomes, scenarios and answer approaches.
- The original owner-approved draft remains unchanged; candidate is NOT copied to the public GitHub site.

## Blocks applying to EVERY course
1. No named manufacturer system/product approval, technical data, drawings, tested ranges or third-party competency sign-off.
2. Core learning units and assessment (4 short topics, 3 recognition questions) do not demonstrate a 30-minute practical lesson or accredited competence.
3. Conceptual 3D cutaways are not checked installation sections; require product-specific dimensional validation.
4. Current technical standards must be applied to the exact proposed design, not inferred from a high-level external article.
5. All 24 remain owner_draft_approved, technical_review_required=true, checkout_enabled=false, and no protected lesson is live.

## Individual release review point
| Course | Review priority | Mandatory evidence |
|---|---|---|
| built-up-01 | High | Tested complete felt system, wind/fire classification and BS 6229:2025 design |
| built-up-02 | Critical | NFRC Safe2Torch zones, flame-free transitions, hot-work permit and fire watch |
| built-up-03 | High | Condensation design and VCL penetrations / insulation fixing |
| built-up-04 | High | Surveyed levels, drainage and tapered falls design |
| built-up-05 | High | Approved lap/upstand/penetration detailing and integrity testing |
| built-up-06 | High | Condition survey, asbestos risks and compatible repair specification |
| tile-slate-01 | High | BS 5534 pitch/headlap/fixing design and 2026 NHBC changes |
| tile-slate-02 | Critical | Authentic BS 5534 roofing battens and 2026 NHBC underlay zoning |
| tile-slate-03 | High | BS EN 12326 slate performance, sorting and fixing evidence |
| tile-slate-04 | High | BS EN 1304/490 covering suitability and system fixings |
| tile-slate-05 | Critical | Lead movement/grades and HSE lead exposure controls |
| tile-slate-06 | Critical | HSE tile silica-dust control, access and fragile-surface strategy |
| metal-sheet-01 | High | Manufacturer load-span, corrosion category and BS 5427 applicability |
| metal-sheet-02 | Critical | MCRMA GD33, wind fixings, pull-out and thermal movement |
| metal-sheet-03 | High | Standing-seam tool/clip/fixed point approvals |
| metal-sheet-04 | High | Tested overlap and weather seal details for slope/exposure |
| metal-sheet-05 | Critical | Rooflight fragility, structural kerb and maintenance access |
| metal-sheet-06 | High | Galvanic risk and manufacturer-approved coatings/repairs |
| liquid-applied-01 | Critical | Kit third-party approvals, chemistry and COSHH controls |
| liquid-applied-02 | Critical | Asbestos/moisture/adhesion testing and substrate acceptance |
| liquid-applied-03 | High | Primer system and manufacturer-specific adhesion thresholds |
| liquid-applied-04 | High | Fleece overlap, wet-out and movement detailing |
| liquid-applied-05 | Critical | Manufacturer consumption/cure and weather limits |
| liquid-applied-06 | High | Defect investigation, integrity test and compatible repair |

## Sources
- [HSE Health and Safety in Roof Work](https://www.hse.gov.uk/pubns/books/hsg33.htm)
- [NFRC Safe2Torch April 2024](https://www.nfrc.co.uk/resource/mrk057-safe2torch-guidance-v2-april-2024--4b--pdf.html)
- [BSI BS 6229:2025](https://knowledge.bsigroup.com/products/flat-roofs-with-continuously-supported-flexible-waterproof-coverings-code-of-practice-1)
- [NHBC 2026 changes](https://www.nhbc.co.uk/insights-and-media/news/latest-edition-of-the-nhbc-standards-published-and-updated-for-2026)
- [HSE roofing-tile dust](https://www.hse.gov.uk/construction/healthrisks/hazardous-substances/cutting-roofing-tiles.htm)
- [HSE lead](https://www.hse.gov.uk/construction/healthrisks/hazardous-substances/lead.htm)
- [MCRMA guidance](https://mcrma.co.uk/guidance/guidance-documents-all/)
- [LRWA technical downloads](https://www.lrwa.org.uk/technical/downloads/)
- [NFRC 2026 roofing batten warning](https://www.nfrc.co.uk/resource/renewed-nfrc-warning-roofing-battens.html)

No qualified third-party certification is claimed. No DB, RLS, public lesson, Stripe checkout, membership or website homepage modifications.

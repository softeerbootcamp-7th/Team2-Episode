package com.yat2.episode.diagnosis;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yat2.episode.diagnosis.dto.DiagnosisArgsReqDto;
import com.yat2.episode.diagnosis.dto.DiagnosisSimpleDto;

@RequiredArgsConstructor
@Service
public class DiagnosisResultService {
    private final DiagnosisResultRepository diagnosisResultRepository;

    @Transactional
    public DiagnosisSimpleDto createDiagnosis(Long userId, DiagnosisArgsReqDto reqDto) {
        //todo: 로직 구현
        return DiagnosisSimpleDto.of(null, 0);
    }
}

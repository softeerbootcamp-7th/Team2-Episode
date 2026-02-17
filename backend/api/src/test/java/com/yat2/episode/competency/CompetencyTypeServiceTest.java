package com.yat2.episode.competency;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import com.yat2.episode.competency.dto.CompetencyTypeRes;

import static com.yat2.episode.utils.TestEntityFactory.createEntity;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("CompetencyTypeService 단위 테스트")
class CompetencyTypeServiceTest {

    @Mock
    private CompetencyTypeRepository competencyTypeRepository;

    @InjectMocks
    private CompetencyTypeService competencyTypeService;

    private CompetencyType createCompetencyType(Integer id, String typeName, CompetencyType.Category category) {
        CompetencyType ct = createEntity(CompetencyType.class);
        ReflectionTestUtils.setField(ct, "id", id);
        ReflectionTestUtils.setField(ct, "typeName", typeName);
        ReflectionTestUtils.setField(ct, "category", category);
        return ct;
    }

    @Nested
    @DisplayName("getAllData")
    class GetAllDataTest {

        @Test
        @DisplayName("전체 역량 타입 목록을 조회하여 DTO로 변환한다")
        void should_return_all_competency_types() {
            CompetencyType type1 = createCompetencyType(1, "의사소통", CompetencyType.Category.협업_커뮤니케이션_역량);
            CompetencyType type2 = createCompetencyType(2, "논리적 사고", CompetencyType.Category.문제해결_사고_역량);

            given(competencyTypeRepository.findAll()).willReturn(List.of(type1, type2));

            List<CompetencyTypeRes> result = competencyTypeService.getAllData();

            assertThat(result).hasSize(2);
            assertThat(result).extracting(CompetencyTypeRes::competencyType)
                    .containsExactlyInAnyOrder("의사소통", "논리적 사고");

            verify(competencyTypeRepository).findAll();
        }
    }
}

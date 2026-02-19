package com.yat2.episode.global.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;

import java.time.LocalDate;

import com.yat2.episode.episode.dto.StarUpdateReq;

import static org.assertj.core.api.Assertions.assertThat;

class JacksonConfigTest {

    @Test
    void jsonNullable_distinguishes_absent_vs_null_vs_value() throws Exception {
        ObjectMapper om = new ObjectMapper();
        om.registerModule(new JsonNullableModule());
        om.registerModule(new JavaTimeModule());

        StarUpdateReq absent = om.readValue("{}", StarUpdateReq.class);
        assertThat(absent.startDate().isUndefined()).isTrue();

        StarUpdateReq nul = om.readValue("{\"startDate\":null}", StarUpdateReq.class);
        assertThat(nul.startDate().isUndefined()).isFalse();
        assertThat(nul.startDate().get()).isNull();

        StarUpdateReq val = om.readValue("{\"startDate\":\"2026-02-18\"}", StarUpdateReq.class);
        assertThat(val.startDate().isUndefined()).isFalse();
        assertThat(val.startDate().get()).isEqualTo(LocalDate.parse("2026-02-18"));
    }
}

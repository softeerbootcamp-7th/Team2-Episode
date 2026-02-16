package com.yat2.episode.collaboration;

import lombok.experimental.UtilityClass;

@UtilityClass
public final class YjsProtocolUtil {
    public static final int MSG_SYNC = 0;

    /* 추후 sync 라우팅을 위함 */
    public static final int SYNC_STEP_1 = 0;
    public static final int SYNC_STEP_2 = 1;
    public static final int SYNC_UPDATE = 2;

    public static boolean isUpdateFrame(byte[] payload) {
        if (payload == null || payload.length < 3) {
            return false;
        }
        return payload[0] == MSG_SYNC && payload[1] == SYNC_UPDATE;
    }
}

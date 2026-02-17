package com.yat2.episode.collaboration.yjs;

import lombok.experimental.UtilityClass;

@UtilityClass
public class YjsProtocolUtil {
    public static final int MSG_SYNC = 0;
    public static final int MSG_AWARENESS = 1;

    public static final int SYNC_STEP_1 = 0;
    public static final int SYNC_STEP_2 = 1;
    public static final int SYNC_UPDATE = 2;

    public static boolean isUpdateFrame(byte[] payload) {
        return hasPrefix(payload, MSG_SYNC, SYNC_UPDATE);
    }

    public static boolean isSync1Frame(byte[] payload) {
        return hasPrefix(payload, MSG_SYNC, SYNC_STEP_1);
    }

    public static boolean isSync2Frame(byte[] payload) {
        return hasPrefix(payload, MSG_SYNC, SYNC_STEP_2);
    }

    public static boolean isAwarenessFrame(byte[] payload) {
        if (payload == null || payload.length < 1) {
            return false;
        }
        return payload[0] == MSG_AWARENESS;
    }

    public static byte[] emptySync2Frame() {
        return new byte[]{ (byte) MSG_SYNC, (byte) SYNC_STEP_2, 0x00 };
    }

    private static boolean hasPrefix(byte[] payload, int b0, int b1) {
        if (payload == null || payload.length < 2) {
            return false;
        }
        return (payload[0] == b0 && payload[1] == b1);
    }
}

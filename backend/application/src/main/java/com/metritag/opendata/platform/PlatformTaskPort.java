package com.metritag.opendata.platform;

import java.util.UUID;

public interface PlatformTaskPort {
    void publish(UUID eventId, String payload) throws Exception;
}

package com.metritag.opendata.platform;

/** A stable, non-sensitive delivery failure code suitable for the outbox record. */
public class PlatformDeliveryException extends Exception {
    private final String code;
    public PlatformDeliveryException(String code) {
        super(code);
        this.code = code;
    }
    public String code() { return code; }
}

package com.metritag.opendata.shared;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.ServletRequestBindingException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.io.IOException;

@RestControllerAdvice
public class ApiErrors {
    private static final Logger LOG = LoggerFactory.getLogger(ApiErrors.class);
    public record ErrorBody(String code, String message, String requestId) {}
    public static ErrorBody body(HttpServletRequest request, String code, String message) {
        return new ErrorBody(code, message, String.valueOf(request.getAttribute("requestId")));
    }
    public static void write(ObjectMapper json, HttpServletRequest request, HttpServletResponse response, int status, String code, String message) throws IOException {
        response.setStatus(status); response.setContentType("application/json");
        json.writeValue(response.getOutputStream(), body(request, code, message));
    }
    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ErrorBody> domain(DomainException error, HttpServletRequest request) {
        return ResponseEntity.status(error.status()).body(body(request, error.code(), error.getMessage()));
    }
    @ExceptionHandler({MethodArgumentNotValidException.class, HandlerMethodValidationException.class,
        MethodArgumentTypeMismatchException.class, HttpMessageNotReadableException.class, ServletRequestBindingException.class})
    public ResponseEntity<ErrorBody> validation(Exception error, HttpServletRequest request) {
        return ResponseEntity.badRequest().body(body(request, "INVALID_REQUEST", "Check the request fields, types and required headers"));
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorBody> conflict(DataIntegrityViolationException error, HttpServletRequest request) {
        return ResponseEntity.status(409).body(body(request, "DATA_CONFLICT", "The business key or hierarchy violates a database constraint"));
    }
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorBody> unexpected(Exception error, HttpServletRequest request) {
        LOG.error("Request {} failed ({})", request.getAttribute("requestId"), error.getClass().getSimpleName());
        return ResponseEntity.internalServerError().body(body(request, "INTERNAL_ERROR", "The request failed; retry later using the same command key"));
    }
}

package com.metritag.opendata.tasks.domain;

import java.util.List;

public record TaskPage(List<TaskView> items, long total, int page, int size) {}

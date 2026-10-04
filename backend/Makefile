CC      = gcc
CFLAGS  = -Wall -Wextra -std=gnu11 -O2
TARGET  = mint-rt-backend
SRC     = src/main.c src/process.c src/monitor.c src/scheduler.c src/deadline.c src/logger.c src/utils.c src/autosched.c src/api.c
HEADERS = src/process.h src/monitor.h src/scheduler.h src/deadline.h src/logger.h src/utils.h src/autosched.h src/api.h

TEST_SCHED     = test_scheduler
TEST_SCHED_SRC = tests/test_scheduler.c src/scheduler.c src/deadline.c src/logger.c

TEST_LOG       = test_logger
TEST_LOG_SRC   = tests/test_logger.c src/logger.c src/scheduler.c src/deadline.c

TEST_UTILS     = test_utils
TEST_UTILS_SRC = tests/test_utils.c src/utils.c

TEST_AUTO      = test_autosched
TEST_AUTO_SRC  = tests/test_autosched.c src/autosched.c src/scheduler.c src/deadline.c src/logger.c

all: $(TARGET)

$(TARGET): $(SRC) $(HEADERS)
	$(CC) $(CFLAGS) -o $(TARGET) $(SRC)

$(TEST_SCHED): $(TEST_SCHED_SRC) $(HEADERS)
	$(CC) $(CFLAGS) -o $(TEST_SCHED) $(TEST_SCHED_SRC)

$(TEST_LOG): $(TEST_LOG_SRC) $(HEADERS)
	$(CC) $(CFLAGS) -o $(TEST_LOG) $(TEST_LOG_SRC)

$(TEST_UTILS): $(TEST_UTILS_SRC) $(HEADERS)
	$(CC) $(CFLAGS) -o $(TEST_UTILS) $(TEST_UTILS_SRC)

$(TEST_AUTO): $(TEST_AUTO_SRC) $(HEADERS)
	$(CC) $(CFLAGS) -o $(TEST_AUTO) $(TEST_AUTO_SRC)

test: $(TEST_SCHED) $(TEST_LOG) $(TEST_UTILS) $(TEST_AUTO)
	./$(TEST_SCHED)
	./$(TEST_LOG)
	./$(TEST_UTILS)
	./$(TEST_AUTO)

clean:
	rm -f $(TARGET) $(TEST_SCHED) $(TEST_LOG) $(TEST_UTILS) $(TEST_AUTO)

.PHONY: all test clean
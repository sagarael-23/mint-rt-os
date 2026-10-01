#include "deadline.h"

long deadline_absolute(long arrival_ms, long relative_ms)
{
    return arrival_ms + relative_ms;
}

long deadline_time_left(long abs_deadline_ms, long now_ms)
{
    return abs_deadline_ms - now_ms;
}

int deadline_is_missed(long abs_deadline_ms, long finish_ms)
{
    return finish_ms > abs_deadline_ms;
}
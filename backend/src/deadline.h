#ifndef DEADLINE_H
#define DEADLINE_H

/* Semua waktu dalam milidetik pada JAM SIMULASI.
   Ini BUKAN deadline Linux asli. */

/* Deadline absolut = waktu datang + deadline relatif. */
long deadline_absolute(long arrival_ms, long relative_ms);

/* Sisa waktu sampai deadline. Nilai <= 0 berarti deadline sudah tiba/lewat. */
long deadline_time_left(long abs_deadline_ms, long now_ms);

/* 1 jika waktu selesai melewati deadline. */
int deadline_is_missed(long abs_deadline_ms, long finish_ms);

#endif
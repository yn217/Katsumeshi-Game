"""Fail-closed placeholder for the retired ComfyUI job submitter.

Character candidates in this repository were generated in the past and remain
available as source assets. The project instruction now disables every new
ComfyUI job. This file intentionally contains no API client, workflow builder,
poller, or network call.
"""
import sys


if __name__ == "__main__":
    raise SystemExit(
        "ComfyUI job submission is disabled. This script no longer sends or polls jobs."
    )

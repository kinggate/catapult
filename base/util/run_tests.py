#!/usr/bin/env python2.7
# Copyright 2015 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import glob
import os
import subprocess
import sys
import unittest


def main():
  test_path = [os.path.abspath(os.path.normpath(os.path.join(
      os.path.dirname(__file__), os.path.pardir, os.path.pardir,
      'temporary', 'tracing', 'build', 'run_dev_server_tests')))]
  if sys.platform.startswith('win'):
    test_path = ['python.exe'] + test_path
  print "TEST PATH:"
  print test_path
  test_proc = subprocess.Popen(
      test_path, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
  test_out, test_err = test_proc.communicate()
  print "OUTPUT"
  print test_out
  print "ERROR"
  print test_err
  sys.exit(test_proc.returncode)

  #sys.path.append(os.path.dirname(__file__))
  #suite = unittest.TestLoader().discover(
  #    os.path.dirname(__file__), pattern = '*_unittest.py')
  #result = unittest.TextTestRunner(verbosity=2).run(suite)
  #if result.wasSuccessful():
  #  sys.exit(0)
  #else:
  #  sys.exit(1)


if __name__ == '__main__':
  main()

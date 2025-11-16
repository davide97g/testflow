// renderer/src/zephyr-mock.js
// Mock implementation of Zephyr API that bypasses authentication

const mockTestCases = [
  {
    "id": 129140099,
    "projectId": 10879,
    "name": "UI Automation - Open DIF (from appointment details sidebar)",
    "key": "BAT-T526",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-01-19T14:06:55Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 129140103,
    "projectId": 10879,
    "name": "UI Automation - Check In Appointment (without changing & adding data)",
    "key": "BAT-T530",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-01-19T14:06:55Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 146992951,
    "projectId": 10879,
    "name": "UI Automation - Add Event",
    "key": "BAT-T950",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 600000,
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-03-22T14:19:41Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 146992952,
    "projectId": 10879,
    "name": "UI Automation - Check event - Timeline view",
    "key": "BAT-T951",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 600000,
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-03-22T14:19:41Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 146992953,
    "projectId": 10879,
    "name": "UI Automation - Check event - Calendar view",
    "key": "BAT-T952",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 600000,
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-03-22T14:19:41Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 146992954,
    "projectId": 10879,
    "name": "UI Automation - Check event - Weekly view",
    "key": "BAT-T953",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 600000,
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-03-22T14:19:41Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 146992958,
    "projectId": 10879,
    "name": "UI Automation - Delete event - Timeline view (check changes in calendar and weekly)",
    "key": "BAT-T957",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 600000,
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-03-22T14:19:41Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 146992959,
    "projectId": 10879,
    "name": "UI Automation - Delete event - Calendar view (check changes in timeline and weekly)",
    "key": "BAT-T958",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 600000,
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-03-22T14:19:42Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 146992960,
    "projectId": 10879,
    "name": "UI Automation - Delete event - Weekly view (check changes in timeline and calendar)",
    "key": "BAT-T959",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 600000,
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-03-22T14:19:42Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 147302322,
    "projectId": 10879,
    "name": "UI Automation - Create an appointment with \"+\" button / Existing patient",
    "key": "BAT-T977",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 300000,
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-03-25T12:12:11Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 147304223,
    "projectId": 10879,
    "name": "UI Automation - Check appointment - List view",
    "key": "BAT-T978",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 180000,
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-03-25T12:51:03Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 147304231,
    "projectId": 10879,
    "name": "UI Automation - Check appointment - Timeline view",
    "key": "BAT-T979",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 180000,
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-03-25T12:51:18Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 147304258,
    "projectId": 10879,
    "name": "UI Automation - Check appointment - Calendar view",
    "key": "BAT-T980",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 180000,
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-03-25T12:52:16Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 147304633,
    "projectId": 10879,
    "name": "UI Automation - Create an appointment with \"+\" button / New patient",
    "key": "BAT-T982",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 300000,
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-03-25T13:02:41Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 147305101,
    "projectId": 10879,
    "name": "UI Automation - Create an appointment - from timeline",
    "key": "BAT-T983",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 300000,
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-03-25T13:20:46Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 147305286,
    "projectId": 10879,
    "name": "UI Automation - Create an appointment - from calendar",
    "key": "BAT-T984",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 300000,
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-03-25T13:24:35Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 147305306,
    "projectId": 10879,
    "name": "UI Automation - Create an appointment - from weekly",
    "key": "BAT-T985",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 300000,
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-03-25T13:25:18Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 147315759,
    "projectId": 10879,
    "name": "UI Automation - Delete an appointment - from list view",
    "key": "BAT-T987",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 600000,
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-03-25T15:54:45Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 147315853,
    "projectId": 10879,
    "name": "UI Automation - Delete an appointment - from appointment details",
    "key": "BAT-T988",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 600000,
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-03-25T15:55:49Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 157221613,
    "projectId": 10879,
    "name": "UI Automation - Create Schedule (One Schedule Rule, Published)",
    "key": "BAT-T1109",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 60000,
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-05-08T13:54:55Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "UI-Automated",
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 157221758,
    "projectId": 10879,
    "name": "UI Automation - Schedule Detail View",
    "key": "BAT-T1110",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 60000,
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-05-08T13:58:53Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 157222622,
    "projectId": 10879,
    "name": "UI Automation - Schedule List View",
    "key": "BAT-T1111",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 60000,
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-05-08T14:04:54Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 157224665,
    "projectId": 10879,
    "name": "UI Automation - Schedule Update - Extend Validity Period (No OOS)",
    "key": "BAT-T1112",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 60000,
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-05-08T14:24:37Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 157226995,
    "projectId": 10879,
    "name": "UI Automation - Schedule Update - Reduce Validity Period (No OOS)",
    "key": "BAT-T1113",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 60000,
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-05-08T14:44:55Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC",
      "UI-Automated"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 157227289,
    "projectId": 10879,
    "name": "UI Automation - Schedule Rule Update - Add a day of the week",
    "key": "BAT-T1114",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-05-08T14:52:40Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC",
      "UI-Automated"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 157231722,
    "projectId": 10879,
    "name": "UI Automation - Schedule Rule Update - Remove a day of the week (with OOS)",
    "key": "BAT-T1115",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 60000,
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-05-08T15:18:46Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC",
      "UI-Automated"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 158529324,
    "projectId": 10879,
    "name": "UI Automation - Schedule Rule Update - Remove Service Type (No OOS)",
    "key": "BAT-T1123",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-05-16T14:23:54Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 158924407,
    "projectId": 10879,
    "name": "UI Automation - Schedule Delete (with OOS)",
    "key": "BAT-T1124",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "createdBy": "63244193d1b3f6489b949c67",
    "createdOn": "2024-05-22T09:07:49Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC",
      "UI-Automated"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 162825160,
    "projectId": 10879,
    "name": "UI Automation - Create a Doctor's Timetable -  with one timetable rule",
    "key": "BAT-T1301",
    "majorVersion": 1,
    "owner": "712020:9dd01606-dbba-4ed7-a1ac-23ee5b290e1d",
    "createdBy": "712020:9dd01606-dbba-4ed7-a1ac-23ee5b290e1d",
    "createdOn": "2024-06-11T15:10:21Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "UI-Automated"
    ],
    "lastTestResultStatus": {
      "name": "Fail",
      "i18nKey": "TEST_RESULT.STATUS.FAIL",
      "color": "#df2f36"
    },
    "customFieldValues": []
  },
  {
    "id": 202150634,
    "projectId": 10879,
    "name": "UI Automation - Schedule Update - Reduce Validity Period (With OOS)",
    "key": "BAT-T1699",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "estimatedTime": 60000,
    "createdBy": "712020:9dd01606-dbba-4ed7-a1ac-23ee5b290e1d",
    "createdOn": "2024-11-12T11:00:48Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC",
      "UI-Automated"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 202153003,
    "projectId": 10879,
    "name": "UI Automation - Check In Appointment - Change Doctor",
    "key": "BAT-T1700",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "createdBy": "712020:9dd01606-dbba-4ed7-a1ac-23ee5b290e1d",
    "createdOn": "2024-11-12T11:13:18Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 202154547,
    "projectId": 10879,
    "name": "UI Automation - Check In Appointment - Change Appointment Type",
    "key": "BAT-T1701",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "createdBy": "712020:9dd01606-dbba-4ed7-a1ac-23ee5b290e1d",
    "createdOn": "2024-11-12T11:25:07Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 202172110,
    "projectId": 10879,
    "name": "UI Automation - Check In Appointment - Add Attachments & Notes",
    "key": "BAT-T1702",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "createdBy": "712020:9dd01606-dbba-4ed7-a1ac-23ee5b290e1d",
    "createdOn": "2024-11-12T11:31:07Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 202299224,
    "projectId": 10879,
    "name": "UI Automation - Multi - Create a Doctor's Timetable -  with one timetable rule",
    "key": "BAT-T1751",
    "majorVersion": 1,
    "owner": "712020:9dd01606-dbba-4ed7-a1ac-23ee5b290e1d",
    "createdBy": "557058:c02be9fb-59e6-4512-8596-8908b0ae7ac2",
    "createdOn": "2024-11-13T14:56:38Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "UI-Automated"
    ],
    "customFieldValues": []
  },
  {
    "id": 202917956,
    "projectId": 10879,
    "name": "UI Automation - Appointment Details - Sidebar",
    "key": "BAT-T1757",
    "majorVersion": 1,
    "owner": "712020:9dd01606-dbba-4ed7-a1ac-23ee5b290e1d",
    "createdBy": "712020:9dd01606-dbba-4ed7-a1ac-23ee5b290e1d",
    "createdOn": "2024-11-19T17:14:19Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  },
  {
    "id": 203839168,
    "projectId": 10879,
    "name": "UI Automation - Schedule Rule Update - Remove Service Type (With OOS)",
    "key": "BAT-T1758",
    "majorVersion": 1,
    "owner": "63244193d1b3f6489b949c67",
    "createdBy": "712020:9dd01606-dbba-4ed7-a1ac-23ee5b290e1d",
    "createdOn": "2024-11-26T13:14:49Z",
    "status": {
      "id": 5573801,
      "name": "Approved",
      "i18nKey": "TESTCASE.STATUS.APPROVED",
      "color": "#3abb4b"
    },
    "priority": {
      "id": 5573802,
      "name": "High",
      "i18nKey": "TESTCASE.PRIORITY.HIGH",
      "color": "#ff0000"
    },
    "folderId": 14146138,
    "labels": [
      "QA-visionx",
      "BC"
    ],
    "lastTestResultStatus": {
      "name": "Pass",
      "i18nKey": "TEST_RESULT.STATUS.PASS",
      "color": "#3abb4b"
    },
    "customFieldValues": []
  }
];

/**
 * Mock implementation of fetchZephyrTests that bypasses authentication
 * and returns the provided test case data
 * 
 * @param {Object} options - Fetch options (ignored in mock mode)
 * @param {string} options.zephyrUrl - Zephyr API URL (ignored)
 * @param {string} options.token - Authentication token (ignored)
 * @param {string} options.projectKey - Project key filter (optional, filters by projectKey if provided)
 * @param {number} options.limit - Maximum number of results (default: 100)
 * @param {number} options.startAt - Pagination offset (default: 0)
 * @returns {Promise<Object>} Response object with ok, tests, and total fields
 */
async function fetchZephyrTestsMock({
  zephyrUrl,
  token,
  projectKey,
  limit = 100,
  startAt = 0,
}) {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Filter by projectKey if provided (extract from test case key, e.g., "BAT-T526" -> "BAT")
  let filteredTests = mockTestCases;
  if (projectKey) {
    filteredTests = mockTestCases.filter((tc) => {
      const keyPrefix = tc.key?.split("-")[0];
      return keyPrefix === projectKey.toUpperCase();
    });
  }

  // Apply pagination
  const total = filteredTests.length;
  const paginatedTests = filteredTests.slice(startAt, startAt + limit);

  // Map to the expected format (matching the real API response format)
  const tests = paginatedTests.map((tc) => ({
    id: tc.id,
    key: tc.key,
    summary: tc.name,
    description: "",
    projectKey: projectKey || tc.key?.split("-")[0] || "BAT",
    // Include additional Zephyr-specific fields
    status: tc.status,
    priority: tc.priority,
    folder: tc.folderId,
    labels: tc.labels || [],
    lastTestResultStatus: tc.lastTestResultStatus,
    estimatedTime: tc.estimatedTime,
    createdOn: tc.createdOn,
    owner: tc.owner,
    createdBy: tc.createdBy,
    // Include full original data for reference
    _original: tc,
  }));

  return {
    ok: true,
    tests,
    total,
  };
}

module.exports = { fetchZephyrTestsMock, mockTestCases };


import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import DatePicker from "~/components/common/DatePicker.vue";
import {
  formatDateYmdJst,
  getTodayJstMidnight,
  parseYmdAsJstMidnight,
} from "~/utils/jstDate";

describe("DatePicker", () => {
  beforeEach(() => {
    // タイムゾーンに依存しないテストのため、日付を固定
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders correctly", () => {
    const date = parseYmdAsJstMidnight("2025-06-28");
    const wrapper = mount(DatePicker, {
      props: {
        modelValue: date,
        label: "Select Date",
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });

    expect(wrapper.find("label").text()).toBe("Select Date");
    expect(wrapper.find('input[type="date"]').exists()).toBe(true);
    expect(wrapper.find("button").text()).toBe("TODAY");
  });

  it("emits update:modelValue when date is changed", async () => {
    const date = parseYmdAsJstMidnight("2025-06-28");
    const wrapper = mount(DatePicker, {
      props: {
        modelValue: date,
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });

    const input = wrapper.find('input[type="date"]');
    await input.setValue("2025-06-29");

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    const emittedValue = wrapper.emitted("update:modelValue")?.[0][0] as Date;
    expect(emittedValue.getTime()).toBe(
      parseYmdAsJstMidnight("2025-06-29").getTime()
    );
    expect(formatDateYmdJst(emittedValue)).toBe("2025-06-29");
  });

  it("selects today in JST when today button is clicked", async () => {
    // 2025-06-28 15:00:00 UTC (2025-06-29 00:00:00 JST) に設定
    const mockDate = new Date("2025-06-28T15:00:00Z");
    vi.setSystemTime(mockDate);

    const date = parseYmdAsJstMidnight("2025-06-28");
    const wrapper = mount(DatePicker, {
      props: {
        modelValue: date,
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });

    const todayButton = wrapper.find("button");
    await todayButton.trigger("click");

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    const emittedValue = wrapper.emitted("update:modelValue")?.[0][0] as Date;

    expect(emittedValue.getTime()).toBe(getTodayJstMidnight().getTime());
    expect(formatDateYmdJst(emittedValue)).toBe("2025-06-29");
  });

  it("selects today in JST when in different timezone", async () => {
    // 2025-06-28 23:00:00 UTC (2025-06-29 08:00:00 JST) に設定
    const mockDate = new Date("2025-06-28T23:00:00Z");
    vi.setSystemTime(mockDate);

    const date = parseYmdAsJstMidnight("2025-06-28");
    const wrapper = mount(DatePicker, {
      props: {
        modelValue: date,
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });

    const todayButton = wrapper.find("button");
    await todayButton.trigger("click");

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    const emittedValue = wrapper.emitted("update:modelValue")?.[0][0] as Date;

    expect(emittedValue.getTime()).toBe(getTodayJstMidnight().getTime());
    expect(formatDateYmdJst(emittedValue)).toBe("2025-06-29");
  });

  it("respects min and max date constraints", () => {
    const date = parseYmdAsJstMidnight("2025-06-28");
    const minDate = parseYmdAsJstMidnight("2025-06-01");
    const maxDate = parseYmdAsJstMidnight("2025-06-30");

    const wrapper = mount(DatePicker, {
      props: {
        modelValue: date,
        minDate,
        maxDate,
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });

    const input = wrapper.find('input[type="date"]');
    expect(input.attributes("min")).toBe("2025-06-01");
    expect(input.attributes("max")).toBe("2025-06-30");
  });

  it("disables input and button when disabled prop is true", () => {
    const date = parseYmdAsJstMidnight("2025-06-28");
    const wrapper = mount(DatePicker, {
      props: {
        modelValue: date,
        disabled: true,
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });

    const input = wrapper.find('input[type="date"]');
    const button = wrapper.find("button");

    expect(input.attributes("disabled")).toBeDefined();
    expect(button.attributes("disabled")).toBeDefined();
  });

  it("hides today button when showTodayButton is false", () => {
    const date = parseYmdAsJstMidnight("2025-06-28");
    const wrapper = mount(DatePicker, {
      props: {
        modelValue: date,
        showTodayButton: false,
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });

    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("displays hint text when provided", () => {
    const date = parseYmdAsJstMidnight("2025-06-28");
    const wrapper = mount(DatePicker, {
      props: {
        modelValue: date,
        hint: "Please select a date",
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });

    expect(wrapper.find("small").text()).toBe("Please select a date");
  });

  it("generates unique input id for accessibility", () => {
    const date = parseYmdAsJstMidnight("2025-06-28");
    const wrapper1 = mount(DatePicker, {
      props: { modelValue: date, label: "Date 1" },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });
    const wrapper2 = mount(DatePicker, {
      props: { modelValue: date, label: "Date 2" },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });

    const id1 = wrapper1.find("input").attributes("id");
    const id2 = wrapper2.find("input").attributes("id");

    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);

    // labelのfor属性が正しく設定されているか確認
    expect(wrapper1.find("label").attributes("for")).toBe(id1);
    expect(wrapper2.find("label").attributes("for")).toBe(id2);
  });
});

import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import DatePicker from "@/components/common/DatePicker.vue";
import { getTodayJstMidnight, parseYmdAsJstMidnight } from "@/utils/jstDate";

describe("DatePicker", () => {
  const defaultProps = {
    modelValue: parseYmdAsJstMidnight("2024-01-15"),
  };

  const mountComponent = (props = {}) => {
    return mount(DatePicker, {
      props: {
        ...defaultProps,
        ...props,
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });
  };

  it("renders correctly", () => {
    const wrapper = mountComponent();

    expect(wrapper.find('input[type="date"]').exists()).toBe(true);
    expect(wrapper.find("button").exists()).toBe(true);
  });

  it("displays the correct date value", () => {
    const wrapper = mountComponent();

    const input = wrapper.find('input[type="date"]');
    expect(input.element.value).toBe("2024-01-15");
  });

  it("emits update:modelValue when date changes", async () => {
    const wrapper = mountComponent();

    const input = wrapper.find('input[type="date"]');
    await input.setValue("2024-02-20");

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")[0][0]).toEqual(
      parseYmdAsJstMidnight("2024-02-20")
    );
  });

  it("emits today date when today button is clicked", async () => {
    vi.useFakeTimers();
    const fixedNow = new Date("2025-10-14T12:34:56Z");
    vi.setSystemTime(fixedNow);

    try {
      const wrapper = mountComponent();

      const todayButton = wrapper.find("button");
      await todayButton.trigger("click");

      expect(wrapper.emitted("update:modelValue")).toBeTruthy();
      const emittedDate = wrapper.emitted("update:modelValue")[0][0] as Date;
      expect(emittedDate.getTime()).toBe(getTodayJstMidnight().getTime());
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows label when provided", () => {
    const wrapper = mountComponent({ label: "Select Date" });

    expect(wrapper.find("label").text()).toBe("Select Date");
  });

  it("shows hint when provided", () => {
    const wrapper = mountComponent({ hint: "Choose a date" });

    expect(wrapper.find("small.text-app-muted").text()).toBe("Choose a date");
  });

  it("disables input when disabled prop is true", () => {
    const wrapper = mountComponent({ disabled: true });

    const input = wrapper.find('input[type="date"]');
    const button = wrapper.find("button");

    expect(input.attributes("disabled")).toBeDefined();
    expect(button.attributes("disabled")).toBeDefined();
  });

  it("hides today button when showTodayButton is false", () => {
    const wrapper = mountComponent({ showTodayButton: false });

    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("sets min and max date attributes", () => {
    const wrapper = mountComponent({
      minDate: new Date("2024-01-01"),
      maxDate: new Date("2024-12-31"),
    });

    const input = wrapper.find('input[type="date"]');
    expect(input.attributes("min")).toBe("2024-01-01");
    expect(input.attributes("max")).toBe("2024-12-31");
  });
});
